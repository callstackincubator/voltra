import fs from 'node:fs'
import path from 'node:path'
import vm from 'node:vm'
import { createRequire } from 'node:module'

import * as babel from '@babel/core'

const MODULE_EXTENSIONS = ['.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs', '']

export interface WidgetModuleBuildInfo {
  isDev: false
  metroUrl: null
  appVersion: 'unknown'
  voltraVersion: string
}

export function createDynamicWidgetBuildInfo(voltraVersion: string): WidgetModuleBuildInfo {
  return {
    isDev: false,
    metroUrl: null,
    appVersion: 'unknown',
    voltraVersion,
  }
}

export function evaluateWidgetModuleExports(
  projectRoot: string,
  filePath: string,
  createError: (message: string) => Error
): unknown {
  const projectRequire = createProjectRequire(projectRoot)
  const moduleCache = new Map<string, unknown>()

  const customRequire = (moduleSpecifier: string, currentDir: string): unknown => {
    if (!isLocalModule(moduleSpecifier)) {
      return projectRequire(moduleSpecifier)
    }

    const resolvedModulePath = resolveModulePath(moduleSpecifier, currentDir)

    if (!resolvedModulePath) {
      throw createError(`Cannot resolve module '${moduleSpecifier}' from '${currentDir}'`)
    }

    const cachedModule = moduleCache.get(resolvedModulePath)
    if (cachedModule !== undefined) {
      return cachedModule
    }

    const transpiledCode = transpileWidgetModule(projectRoot, resolvedModulePath, projectRequire, createError)
    const moduleDir = path.dirname(resolvedModulePath)
    const moduleRecord = { exports: {} as Record<string, unknown> }
    moduleCache.set(resolvedModulePath, moduleRecord.exports)

    const context = vm.createContext({
      __dirname: moduleDir,
      __filename: resolvedModulePath,
      console,
      exports: moduleRecord.exports,
      module: moduleRecord,
      process,
      require: (specifier: string) => customRequire(specifier, moduleDir),
    })

    const script = new vm.Script(transpiledCode, { filename: resolvedModulePath })
    script.runInContext(context)

    moduleCache.set(resolvedModulePath, moduleRecord.exports)
    return moduleRecord.exports
  }

  return customRequire(filePath, path.dirname(filePath))
}

function transpileWidgetModule(
  projectRoot: string,
  filePath: string,
  projectRequire: NodeRequire,
  createError: (message: string) => Error
): string {
  const source = fs.readFileSync(filePath, 'utf8')
  const projectBabelConfigPath = resolveProjectBabelConfig(projectRoot)
  const result = babel.transformSync(source, {
    babelrc: false,
    configFile: projectBabelConfigPath,
    cwd: projectRoot,
    filename: filePath,
    presets: projectBabelConfigPath ? undefined : [resolveFallbackBabelPreset(projectRequire, createError)],
  })

  if (!result?.code) {
    throw createError(`Babel transpilation failed for ${filePath}`)
  }

  return result.code
}

function resolveProjectBabelConfig(projectRoot: string): string | undefined {
  const candidates = ['babel.config.js', 'babel.config.cjs', 'babel.config.mjs']

  for (const candidate of candidates) {
    const candidatePath = path.join(projectRoot, candidate)
    if (fs.existsSync(candidatePath)) {
      return candidatePath
    }
  }

  return undefined
}

function resolveFallbackBabelPreset(projectRequire: NodeRequire, createError: (message: string) => Error): string {
  try {
    return projectRequire.resolve('@react-native/babel-preset')
  } catch {
    try {
      return projectRequire.resolve('babel-preset-expo')
    } catch {
      throw createError(
        'Could not resolve a Babel preset for widget evaluation. Add a project babel.config.js or install @react-native/babel-preset.'
      )
    }
  }
}

function createProjectRequire(projectRoot: string): NodeRequire {
  return createRequire(path.join(projectRoot, 'package.json'))
}

function isLocalModule(moduleSpecifier: string): boolean {
  return moduleSpecifier.startsWith('.') || moduleSpecifier.startsWith('/')
}

function resolveModulePath(moduleSpecifier: string, fromDir: string): string | null {
  const basePath = path.resolve(fromDir, moduleSpecifier)

  for (const extension of MODULE_EXTENSIONS) {
    const candidate = `${basePath}${extension}`
    if (fs.existsSync(candidate) && fs.statSync(candidate).isFile()) {
      return candidate
    }
  }

  if (!fs.existsSync(basePath) || !fs.statSync(basePath).isDirectory()) {
    return null
  }

  for (const extension of MODULE_EXTENSIONS) {
    const indexCandidate = path.join(basePath, `index${extension}`)
    if (fs.existsSync(indexCandidate) && fs.statSync(indexCandidate).isFile()) {
      return indexCandidate
    }
  }

  return null
}
