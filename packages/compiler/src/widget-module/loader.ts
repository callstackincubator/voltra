import fs from 'node:fs'
import { createRequire } from 'node:module'
import path from 'node:path'
import vm from 'node:vm'

import * as babel from '@babel/core'

import * as reactNativeAndroid from '../react-native/android'
import * as reactNativeIos from '../react-native/ios'
import {
  describeUnsupportedReactNativeExport,
  getWidgetReactNativeShimSpecifier,
  resolveWidgetImport,
  type WidgetModulePlatform,
} from './policy'

/** Extensions tried when resolving a relative import from widget code. */
const MODULE_EXTENSIONS = ['.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs', '']

/** Project Babel configurations honoured when transpiling widget code. */
const BABEL_CONFIG_FILENAMES = ['babel.config.js', 'babel.config.cjs', 'babel.config.mjs']

/** Presets used when the project does not define its own Babel configuration. */
const FALLBACK_BABEL_PRESETS = ['@react-native/babel-preset', 'babel-preset-expo']

export interface CreateWidgetModuleLoaderOptions {
  /** Root of the app project. Bare imports and Babel configuration resolve from here. */
  projectRoot: string
  /** Platform the widget is being loaded for. Drives `Platform.OS` in widget code. */
  platform: WidgetModulePlatform
  /** Called once per distinct message when an import is served from somewhere else. */
  onWarning?: (message: string) => void
  /** Wraps loader failures so callers can surface them as their own error type. */
  createError?: (message: string) => Error
}

export interface WidgetModuleLoader {
  /** Evaluate `entryPath` and return its exports object. */
  load<TExports = unknown>(entryPath: string): TExports
  /** Evaluate `entryPath` and return its default export, falling back to the exports object. */
  loadDefaultExport<TExport = unknown>(entryPath: string): TExport
}

/**
 * Create a loader that evaluates widget source the way Voltra's build steps need it.
 *
 * Relative imports are transpiled with the project's Babel setup and evaluated in a
 * Node VM; bare imports go through {@link resolveWidgetImport} so that build-time
 * evaluation and the on-device Metro bundle agree on what widget code may import.
 *
 * Each `load` call gets a fresh module cache, matching Node's behaviour of evaluating a
 * dependency graph once per entry point. Warnings are deduplicated across the loader's
 * lifetime so a project-wide message is reported once, not once per widget.
 */
export function createWidgetModuleLoader({
  projectRoot,
  platform,
  onWarning,
  createError = (message) => new Error(message),
}: CreateWidgetModuleLoaderOptions): WidgetModuleLoader {
  const projectRequire = createRequire(path.join(projectRoot, 'package.json'))
  const warnedMessages = new Set<string>()

  function warnOnce(message: string): void {
    if (warnedMessages.has(message)) {
      return
    }

    warnedMessages.add(message)
    onWarning?.(message)
  }

  function requireBareModule(specifier: string): unknown {
    const resolution = resolveWidgetImport(specifier, platform)

    if (resolution.kind === 'blocked') {
      throw createError(resolution.reason)
    }

    if (resolution.kind === 'passthrough') {
      return projectRequire(specifier)
    }

    if (resolution.warning) {
      warnOnce(resolution.warning)
    }

    if (resolution.specifier === getWidgetReactNativeShimSpecifier(platform)) {
      return createReactNativeShimExports(platform)
    }

    return projectRequire(resolution.specifier)
  }

  function load<TExports = unknown>(entryPath: string): TExports {
    const moduleCache = new Map<string, unknown>()

    function customRequire(specifier: string, currentDir: string): unknown {
      if (!isRelativeModule(specifier)) {
        return requireBareModule(specifier)
      }

      const resolvedPath = resolveModulePath(specifier, currentDir)

      if (!resolvedPath) {
        throw createError(`Cannot resolve module '${specifier}' from '${currentDir}'`)
      }

      if (moduleCache.has(resolvedPath)) {
        return moduleCache.get(resolvedPath)
      }

      const transpiledCode = transpile(resolvedPath)
      const moduleDir = path.dirname(resolvedPath)
      const moduleRecord = { exports: {} as Record<string, unknown> }

      // Cache before evaluating so circular imports see a partial exports object
      // instead of re-entering evaluation.
      moduleCache.set(resolvedPath, moduleRecord.exports)

      const context = vm.createContext({
        __dirname: moduleDir,
        __filename: resolvedPath,
        console,
        exports: moduleRecord.exports,
        module: moduleRecord,
        process,
        require: (nestedSpecifier: string) => customRequire(nestedSpecifier, moduleDir),
      })

      new vm.Script(transpiledCode, { filename: resolvedPath }).runInContext(context)

      // `module.exports` may have been reassigned wholesale.
      moduleCache.set(resolvedPath, moduleRecord.exports)

      return moduleRecord.exports
    }

    return customRequire(entryPath, path.dirname(entryPath)) as TExports
  }

  function transpile(filePath: string): string {
    const source = fs.readFileSync(filePath, 'utf8')
    const projectBabelConfigPath = resolveProjectBabelConfig(projectRoot)
    const result = babel.transformSync(source, {
      babelrc: false,
      cwd: projectRoot,
      filename: filePath,
      ...(projectBabelConfigPath
        ? { configFile: projectBabelConfigPath }
        : { configFile: false, presets: [resolveFallbackBabelPreset(projectRequire, createError)] }),
    })

    if (!result?.code) {
      throw createError(`Babel transpilation failed for ${filePath}`)
    }

    return result.code
  }

  return {
    load,
    loadDefaultExport<TExport = unknown>(entryPath: string): TExport {
      const exports = load<Record<string, unknown> | undefined>(entryPath)

      if (exports && typeof exports === 'object' && 'default' in exports && exports.default !== undefined) {
        return exports.default as TExport
      }

      return exports as TExport
    },
  }
}

/**
 * Serve the shim behind a proxy so a named import the shim does not implement fails with
 * an actionable message instead of becoming `undefined` at render time.
 *
 * The shim is imported from this package rather than resolved against the app project,
 * which need not depend on it directly.
 */
function createReactNativeShimExports(platform: WidgetModulePlatform): unknown {
  const shim = platform === 'ios' ? reactNativeIos : reactNativeAndroid
  const shimExports: Record<string, unknown> = { __esModule: true, ...shim }

  return new Proxy(shimExports, {
    get(target, property) {
      if (typeof property === 'symbol' || property in target) {
        return Reflect.get(target, property)
      }

      throw new Error(describeUnsupportedReactNativeExport(String(property)))
    },
  })
}

function isRelativeModule(specifier: string): boolean {
  return specifier.startsWith('.') || specifier.startsWith('/')
}

function resolveModulePath(specifier: string, fromDir: string): string | null {
  const basePath = path.resolve(fromDir, specifier)

  for (const extension of MODULE_EXTENSIONS) {
    const candidate = `${basePath}${extension}`

    if (isFile(candidate)) {
      return candidate
    }
  }

  if (!isDirectory(basePath)) {
    return null
  }

  for (const extension of MODULE_EXTENSIONS) {
    const candidate = path.join(basePath, `index${extension}`)

    if (isFile(candidate)) {
      return candidate
    }
  }

  return null
}

function isFile(candidate: string): boolean {
  return fs.existsSync(candidate) && fs.statSync(candidate).isFile()
}

function isDirectory(candidate: string): boolean {
  return fs.existsSync(candidate) && fs.statSync(candidate).isDirectory()
}

function resolveProjectBabelConfig(projectRoot: string): string | undefined {
  for (const filename of BABEL_CONFIG_FILENAMES) {
    const candidatePath = path.join(projectRoot, filename)

    if (fs.existsSync(candidatePath)) {
      return candidatePath
    }
  }

  return undefined
}

function resolveFallbackBabelPreset(projectRequire: NodeRequire, createError: (message: string) => Error): string {
  for (const preset of FALLBACK_BABEL_PRESETS) {
    try {
      return projectRequire.resolve(preset)
    } catch {
      continue
    }
  }

  throw createError(
    `Could not resolve a Babel preset for widget evaluation. Add a project babel.config.js or install ${FALLBACK_BABEL_PRESETS[0]}.`
  )
}
