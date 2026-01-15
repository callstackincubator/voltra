import fs from 'node:fs'
import path from 'node:path'
import vm from 'node:vm'

import * as babel from '@babel/core'

import { MODULE_EXTENSIONS } from '../constants'

/**
 * Type for the widget renderer function
 */
export type WidgetRenderer = (variants: any) => string

/**
 * Minimal interface for widget configuration needed for prerendering
 */
export interface PrerenderableWidget {
  id: string
  initialStatePath?: string
}

/**
 * Check if a module specifier is a relative or absolute path (local file)
 */
function isLocalModule(moduleSpecifier: string): boolean {
  return moduleSpecifier.startsWith('.') || moduleSpecifier.startsWith('/')
}

/**
 * Resolve a module path, trying different extensions
 */
function resolveModulePath(moduleSpecifier: string, fromDir: string): string | null {
  const basePath = path.resolve(fromDir, moduleSpecifier)

  for (const ext of MODULE_EXTENSIONS) {
    const fullPath = basePath + ext
    if (fs.existsSync(fullPath) && fs.statSync(fullPath).isFile()) {
      return fullPath
    }
  }

  // Try index files if it's a directory
  if (fs.existsSync(basePath) && fs.statSync(basePath).isDirectory()) {
    for (const ext of MODULE_EXTENSIONS) {
      const indexPath = path.join(basePath, 'index' + ext)
      if (fs.existsSync(indexPath)) {
        return indexPath
      }
    }
  }

  return null
}

/**
 * Transpile a file with Babel
 */
function transpileFile(filePath: string, projectRoot: string): string {
  const code = fs.readFileSync(filePath, 'utf8')
  const filename = path.basename(filePath)

  const result = babel.transformSync(code, {
    cwd: projectRoot,
    filename,
  })

  if (!result || !result.code) {
    throw new Error(`Babel transpilation failed for ${filePath}`)
  }

  return result.code
}

/**
 * Evaluate a widget module using Babel transpilation and Node.js VM.
 * This allows executing widget code that uses JSX and React components.
 * Local module dependencies are also transpiled with the same Babel settings.
 */
function evaluateWidgetModule(projectRoot: string, filePath: string): any {
  // Cache for already-evaluated modules to handle circular dependencies
  const moduleCache = new Map<string, any>()

  /**
   * Custom require that transpiles local modules with Babel
   */
  function customRequire(moduleSpecifier: string, currentDir: string): any {
    // For non-local modules (npm packages), use native require
    if (!isLocalModule(moduleSpecifier)) {
      return require(moduleSpecifier)
    }

    // Resolve the local module path
    const resolvedPath = resolveModulePath(moduleSpecifier, currentDir)
    if (!resolvedPath) {
      throw new Error(`Cannot resolve module '${moduleSpecifier}' from '${currentDir}'`)
    }

    // Return cached module if already evaluated
    if (moduleCache.has(resolvedPath)) {
      return moduleCache.get(resolvedPath)
    }

    // Transpile and evaluate the module
    const transpiledCode = transpileFile(resolvedPath, projectRoot)
    const moduleDir = path.dirname(resolvedPath)

    const mockModule = { exports: {} as any }

    // Create require function bound to the module's directory
    const boundRequire = (spec: string) => customRequire(spec, moduleDir)

    const context = vm.createContext({
      exports: mockModule.exports,
      module: mockModule,
      require: boundRequire,
      __filename: resolvedPath,
      __dirname: moduleDir,
      console: console,
      process: process,
    })

    // Cache before evaluation to handle circular dependencies
    moduleCache.set(resolvedPath, mockModule.exports)

    const script = new vm.Script(transpiledCode, { filename: resolvedPath })
    script.runInContext(context)

    // Update cache with final exports (in case module.exports was reassigned)
    moduleCache.set(resolvedPath, mockModule.exports)

    return mockModule.exports
  }

  // Evaluate the entry module
  const exports = customRequire(filePath, path.dirname(filePath))
  const widgetVariants: any = exports.default || exports

  if (!widgetVariants || typeof widgetVariants !== 'object') {
    throw new Error('Widget file must export a WidgetVariants object or have a default export of WidgetVariants')
  }

  return widgetVariants
}

/**
 * Prerender widget initial states for build-time inclusion.
 *
 * Widget code is transpiled with Babel and executed in a Node.js VM sandbox.
 * This function loads widget files that export WidgetVariants for widgets with initialStatePath configured,
 * renders them to JSON, and returns a map of prerendered states that can be bundled into the app.
 *
 * @param widgets - Array of widget configurations
 * @param projectRoot - Root directory of the Expo project
 * @param renderer - The renderer function to use (voltra/server or voltra/android/server)
 * @returns Map of widgetId -> prerendered widget state as JSON string
 */
export async function prerenderWidgetState(
  widgets: PrerenderableWidget[],
  projectRoot: string,
  renderer: WidgetRenderer
): Promise<Map<string, string>> {
  const prerenderedStates = new Map<string, string>()

  for (const widget of widgets) {
    if (!widget.initialStatePath) {
      continue
    }

    try {
      // Resolve the absolute path to the widget file
      const absoluteWidgetPath = path.resolve(projectRoot, widget.initialStatePath)

      // Evaluate the module (transpiles with Babel and executes in VM)
      const widgetVariants = evaluateWidgetModule(projectRoot, absoluteWidgetPath)

      // Render the widget variants to a JSON string
      const prerenderedState = renderer(widgetVariants)

      prerenderedStates.set(widget.id, prerenderedState)
    } catch (error) {
      throw new Error(
        `Failed to prerender widget state for ${widget.id} (${widget.initialStatePath}): ${
          error instanceof Error ? error.message : String(error)
        }`
      )
    }
  }

  return prerenderedStates
}
