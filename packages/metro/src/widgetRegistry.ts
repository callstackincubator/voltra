import crypto from 'node:crypto'
import fs from 'node:fs'
import path from 'node:path'

import { scanVoltraDirectives, type VoltraDirectiveWidget } from './scanner'

const IGNORED_ANYWHERE = new Set(['node_modules'])
const IGNORED_ROOT = new Set(['ios', 'android', 'Pods', 'build', 'dist', 'coverage'])
const SOURCE_EXT = /\.[cm]?[jt]sx?$/
const USE_VOLTRA_LITERAL = 'use voltra'
const DEV_BARREL_PLATFORMS = ['ios', 'android']

export type RegisteredVoltraWidget = VoltraDirectiveWidget & {
  generatedEntryPath: string
  generatedEntryRelativePath: string
}

type FileWatcher = {
  on(event: string, callback: (filePath: string) => void): void
  close(): void
}

export type WidgetRegistry = {
  projectRoot: string
  getWidget(widgetId: string): RegisteredVoltraWidget | null
  isReady(): boolean
  listWidgets(): Array<{
    id: string
    componentName: string
    exportName: string
    sourcePath: string
    generatedEntryRelativePath: string
  }>
  close(): void
}

function toPosixPath(value: string): string {
  return value.split(path.sep).join('/')
}

function ensureDirectory(directory: string): void {
  fs.mkdirSync(directory, { recursive: true })
}

function writeFileIfChanged(filePath: string, content: string): void {
  try {
    if (fs.readFileSync(filePath, 'utf8') === content) {
      return
    }
  } catch {
    // File does not exist yet or is unreadable.
  }
  fs.writeFileSync(filePath, content)
}

function hash(value: string): string {
  return crypto.createHash('sha1').update(value).digest('hex').slice(0, 10)
}

function safeFileName(value: string): string {
  return value.replace(/[^a-zA-Z0-9_.-]+/g, '-')
}

export class DuplicateVoltraWidgetError extends Error {
  constructor({
    widgetId,
    firstPath,
    secondPath,
    projectRoot,
  }: {
    widgetId: string
    firstPath: string
    secondPath: string
    projectRoot: string
  }) {
    const firstRelativePath = toPosixPath(path.relative(projectRoot, firstPath))
    const secondRelativePath = toPosixPath(path.relative(projectRoot, secondPath))

    super(
      `Duplicate Voltra widget component "${widgetId}" found in both "${firstRelativePath}" and "${secondRelativePath}". ` +
        'Widget IDs are inherited from component names and must be unique.'
    )

    this.name = 'DuplicateVoltraWidgetError'
  }
}

export function ensureEmptyDevBarrel(projectRoot: string): string {
  const generatedRoot = path.join(projectRoot, '.voltra', 'metro')
  const emptyBarrelPath = path.join(generatedRoot, 'widgets-dev-barrel.empty.js')
  ensureDirectory(generatedRoot)
  writeFileIfChanged(emptyBarrelPath, '// AUTO-GENERATED - empty Voltra widget hot-reload barrel.\n')
  return emptyBarrelPath
}

export function createWidgetRegistry({ projectRoot = process.cwd() }: { projectRoot?: string } = {}): WidgetRegistry {
  const generatedRoot = path.join(projectRoot, '.voltra', 'metro')
  const generatedEntryRoot = path.join(generatedRoot, 'entries')
  const widgetsById = new Map<string, RegisteredVoltraWidget>()
  const widgetIdsBySourcePath = new Map<string, string[]>()
  let ready = false
  let watcher: FileWatcher | null = null

  function createGeneratedEntry(
    widget: VoltraDirectiveWidget
  ): Pick<RegisteredVoltraWidget, 'generatedEntryPath' | 'generatedEntryRelativePath'> {
    ensureDirectory(generatedEntryRoot)

    const entryFileName = `${safeFileName(widget.id)}-${hash(`${widget.sourcePath}:${widget.exportName}`)}.js`
    const generatedEntryPath = path.join(generatedEntryRoot, entryFileName)
    const importPath = toPosixPath(path.relative(generatedEntryRoot, widget.sourcePath)).replace(/\.[cm]?[jt]sx?$/, '')
    const normalizedImportPath = importPath.startsWith('.') ? importPath : `./${importPath}`
    const exportExpression =
      widget.exportName === 'default' ? 'WidgetModule.default' : `WidgetModule[${JSON.stringify(widget.exportName)}]`

    fs.writeFileSync(
      generatedEntryPath,
      [
        "import { createElement } from 'react'",
        "import { renderVoltraVariantToJson } from '@use-voltra/ios'",
        `import * as WidgetModule from ${JSON.stringify(normalizedImportPath)}`,
        '',
        `const Widget = ${exportExpression}`,
        '',
        'if (!Widget) {',
        `  throw new Error(${JSON.stringify(`Unable to find Voltra widget export "${widget.exportName}".`)})`,
        '}',
        '',
        '// Voltra client-rendered widget entry - invoked by the native JS runtime on every render.',
        'export function render(propsJSON, envJSON) {',
        "  const props = typeof propsJSON === 'string' ? (propsJSON ? JSON.parse(propsJSON) : {}) : (propsJSON || {})",
        "  const env = typeof envJSON === 'string' ? (envJSON ? JSON.parse(envJSON) : {}) : (envJSON || {})",
        '  const WidgetWithEnv = (forwardedProps) => Widget(forwardedProps, env)',
        '  const resolved = renderVoltraVariantToJson(createElement(WidgetWithEnv, props))',
        '  return JSON.stringify(resolved)',
        '}',
        '',
        'export default render',
        'export { Widget }',
        '',
      ].join('\n')
    )

    return {
      generatedEntryPath,
      generatedEntryRelativePath: toPosixPath(path.relative(projectRoot, generatedEntryPath)),
    }
  }

  function widgetPlatform(widget: VoltraDirectiveWidget): string | null {
    const segments = toPosixPath(path.relative(projectRoot, widget.sourcePath)).split('/')
    if (segments.includes('android')) {
      return 'android'
    }
    if (segments.includes('ios')) {
      return 'ios'
    }
    return null
  }

  function writeDevBarrels(): void {
    ensureDirectory(generatedRoot)
    ensureEmptyDevBarrel(projectRoot)

    for (const platform of DEV_BARREL_PLATFORMS) {
      const imports = Array.from(widgetsById.values())
        .filter((widget) => {
          const platformForWidget = widgetPlatform(widget)
          return platformForWidget === null || platformForWidget === platform
        })
        .map((widget) => {
          const importPath = toPosixPath(path.relative(generatedRoot, widget.sourcePath)).replace(SOURCE_EXT, '')
          const normalizedImportPath = importPath.startsWith('.') ? importPath : `./${importPath}`
          return `import ${JSON.stringify(normalizedImportPath)}`
        })

      const content = [
        '// AUTO-GENERATED - do not edit. Side-effect imports that place every Voltra widget in the',
        '// host app dependency graph so Metro Fast Refresh drives dev hot reload of widgets.',
        ...imports,
        '',
      ].join('\n')

      writeFileIfChanged(path.join(generatedRoot, `widgets-dev-barrel.${platform}.js`), content)
    }
  }

  function removeSourcePath(sourcePath: string): void {
    const widgetIds = widgetIdsBySourcePath.get(sourcePath) || []

    for (const widgetId of widgetIds) {
      widgetsById.delete(widgetId)
    }

    widgetIdsBySourcePath.delete(sourcePath)
  }

  function registerWidgets(sourcePath: string, widgets: VoltraDirectiveWidget[]): RegisteredVoltraWidget[] {
    removeSourcePath(sourcePath)

    if (widgets.length === 0) {
      return []
    }

    const newWidgetsById = new Map<string, VoltraDirectiveWidget>()
    for (const widget of widgets) {
      const duplicateInSource = newWidgetsById.get(widget.id)

      if (duplicateInSource) {
        throw new DuplicateVoltraWidgetError({
          widgetId: widget.id,
          firstPath: duplicateInSource.sourcePath,
          secondPath: widget.sourcePath,
          projectRoot,
        })
      }

      newWidgetsById.set(widget.id, widget)

      const existingWidget = widgetsById.get(widget.id)

      if (existingWidget) {
        throw new DuplicateVoltraWidgetError({
          widgetId: widget.id,
          firstPath: existingWidget.sourcePath,
          secondPath: widget.sourcePath,
          projectRoot,
        })
      }
    }

    const registered = widgets.map((widget) => {
      const entry = createGeneratedEntry(widget)
      const registeredWidget = {
        ...widget,
        ...entry,
      }

      widgetsById.set(widget.id, registeredWidget)
      return registeredWidget
    })

    widgetIdsBySourcePath.set(
      sourcePath,
      registered.map((widget) => widget.id)
    )

    return registered
  }

  function scanFile(filePath: string): RegisteredVoltraWidget[] {
    let source: string
    try {
      source = fs.readFileSync(filePath, 'utf8')
    } catch {
      removeSourcePath(filePath)
      return []
    }

    if (!source.includes(USE_VOLTRA_LITERAL)) {
      removeSourcePath(filePath)
      return []
    }

    try {
      const widgets = scanVoltraDirectives({ filePath, source })
      return registerWidgets(filePath, widgets)
    } catch (error) {
      if (error instanceof DuplicateVoltraWidgetError) {
        throw error
      }
      console.warn(
        `[voltra:metro] Failed to scan ${filePath}: ${error instanceof Error ? error.message : String(error)}`
      )
      removeSourcePath(filePath)
      return []
    }
  }

  function scanProject(): void {
    const stack = [projectRoot]
    while (stack.length > 0) {
      const dir = stack.pop()
      if (!dir) {
        continue
      }

      let entries: fs.Dirent[]
      try {
        entries = fs.readdirSync(dir, { withFileTypes: true })
      } catch {
        continue
      }
      for (const entry of entries) {
        if (entry.isDirectory()) {
          const skip =
            IGNORED_ANYWHERE.has(entry.name) ||
            entry.name.startsWith('.') ||
            (dir === projectRoot && IGNORED_ROOT.has(entry.name))
          if (!skip) {
            stack.push(path.join(dir, entry.name))
          }
        } else if (entry.isFile() && SOURCE_EXT.test(entry.name)) {
          scanFile(path.join(dir, entry.name))
        }
      }
    }
  }

  function isIgnoredPath(candidate: string): boolean {
    const segments = toPosixPath(path.relative(projectRoot, candidate)).split('/')
    if (segments[0] === '..') {
      return true
    }
    if (IGNORED_ROOT.has(segments[0])) {
      return true
    }
    return segments.some((segment) => IGNORED_ANYWHERE.has(segment) || segment.startsWith('.'))
  }

  function startWatcher(): void {
    let chokidar: { watch(root: string, options: unknown): FileWatcher }
    try {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      chokidar = require('chokidar')
    } catch {
      try {
        const metroDir = path.dirname(require.resolve('metro/package.json', { paths: [projectRoot] }))
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        chokidar = require(require.resolve('chokidar', { paths: [metroDir] }))
      } catch {
        console.warn('[voltra:metro] chokidar unavailable - widget discovery is startup-scan only (no live updates)')
        return
      }
    }

    watcher = chokidar.watch(projectRoot, {
      ignoreInitial: true,
      ignored: (candidate: string) => isIgnoredPath(candidate),
    })

    const onUpsert = (filePath: string) => {
      if (!SOURCE_EXT.test(filePath)) {
        return
      }
      try {
        scanFile(filePath)
        writeDevBarrels()
      } catch (error) {
        console.error(`[voltra:metro] ${error instanceof Error ? error.message : String(error)}`)
      }
    }

    watcher.on('add', onUpsert)
    watcher.on('change', onUpsert)
    watcher.on('unlink', (filePath: string) => {
      removeSourcePath(filePath)
      writeDevBarrels()
    })
  }

  scanProject()
  writeDevBarrels()
  ready = true
  startWatcher()

  return {
    projectRoot,
    getWidget(widgetId: string) {
      return widgetsById.get(widgetId) || null
    },
    isReady() {
      return ready
    },
    listWidgets() {
      return Array.from(widgetsById.values()).map((widget) => ({
        id: widget.id,
        componentName: widget.componentName,
        exportName: widget.exportName,
        sourcePath: toPosixPath(path.relative(projectRoot, widget.sourcePath)),
        generatedEntryRelativePath: widget.generatedEntryRelativePath,
      }))
    },
    close() {
      if (watcher) {
        watcher.close()
        watcher = null
      }
    },
  }
}
