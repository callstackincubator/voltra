const crypto = require('node:crypto')
const fs = require('node:fs')
const path = require('node:path')

const { scanVoltraDirectives } = require('./scanVoltraDirectives')

function toPosixPath(value) {
  return value.split(path.sep).join('/')
}

function ensureDirectory(directory) {
  fs.mkdirSync(directory, { recursive: true })
}

function hash(value) {
  return crypto.createHash('sha1').update(value).digest('hex').slice(0, 10)
}

function safeFileName(value) {
  return value.replace(/[^a-zA-Z0-9_.-]+/g, '-')
}

// Widget discovery scans the project filesystem (not Metro's dependency graph), so a 'use voltra'
// file is found whether or not anything imports it — no side-effect imports required. Directories
// that never contain widget source are skipped for speed.
//
// `node_modules` and dotdirs are skipped at any depth. The native/build dirs are skipped only at
// the project root — `ios`/`android` are *also* the names of widget source dirs (`widgets/ios`,
// `widgets/android`), which must NOT be skipped.
const IGNORED_ANYWHERE = new Set(['node_modules'])
const IGNORED_ROOT = new Set(['ios', 'android', 'Pods', 'build', 'dist', 'coverage'])
const SOURCE_EXT = /\.[cm]?[jt]sx?$/
const USE_VOLTRA_LITERAL = 'use voltra'

class DuplicateVoltraWidgetError extends Error {
  constructor({ widgetId, firstPath, secondPath, projectRoot }) {
    const firstRelativePath = toPosixPath(path.relative(projectRoot, firstPath))
    const secondRelativePath = toPosixPath(path.relative(projectRoot, secondPath))

    super(
      `Duplicate Voltra widget component "${widgetId}" found in both "${firstRelativePath}" and "${secondRelativePath}". ` +
        'Widget IDs are inherited from component names and must be unique.'
    )

    this.name = 'DuplicateVoltraWidgetError'
  }
}

function createWidgetRegistry({ projectRoot } = {}) {
  const generatedRoot = path.join(projectRoot, '.voltra', 'metro')
  const generatedEntryRoot = path.join(generatedRoot, 'entries')
  const widgetsById = new Map()
  const widgetIdsBySourcePath = new Map()
  let ready = false
  let watcher = null

  function createGeneratedEntry(widget) {
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
        '// Voltra client-rendered widget entry — invoked by the native JS runtime on every render.',
        '//',
        '// Props / env cross the JSC / Hermes boundary as JSON strings (cheapest marshaling),',
        '// so the entry parses them before calling the widget. Env is closure-passed because',
        '// createElement does not accept extra positional args. The resolved Voltra node tree',
        "// is stringified before returning so the native side gets a plain String it can hand",
        '// to the existing payload parser.',
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
      ].join('\n'),
    )

    return {
      generatedEntryPath,
      generatedEntryRelativePath: toPosixPath(path.relative(projectRoot, generatedEntryPath)),
    }
  }

  function removeSourcePath(sourcePath) {
    const widgetIds = widgetIdsBySourcePath.get(sourcePath) || []

    for (const widgetId of widgetIds) {
      widgetsById.delete(widgetId)
    }

    widgetIdsBySourcePath.delete(sourcePath)
  }

  function registerWidgets(sourcePath, widgets) {
    removeSourcePath(sourcePath)

    if (widgets.length === 0) {
      return []
    }

    const newWidgetsById = new Map()
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

  // Scan a single file: cheap 'use voltra' substring check (Babel parsing is not free) before the
  // real directive scan. Rethrows DuplicateVoltraWidgetError (a real config error); other errors
  // (e.g. a transient parse error mid-edit) are logged and the file's widgets dropped.
  function scanFile(filePath) {
    let source
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
      console.warn(`[voltra:metro] Failed to scan ${filePath}: ${error.message}`)
      removeSourcePath(filePath)
      return []
    }
  }

  // Synchronous recursive walk of the project for 'use voltra' widget files. Runs once at startup
  // so the registry is populated before the first bundle request.
  function scanProject() {
    const stack = [projectRoot]
    while (stack.length > 0) {
      const dir = stack.pop()
      let entries
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

  function isIgnoredPath(candidate) {
    const segments = toPosixPath(path.relative(projectRoot, candidate)).split('/')
    if (segments[0] === '..') {
      return true // outside the project
    }
    if (IGNORED_ROOT.has(segments[0])) {
      return true
    }
    return segments.some((segment) => IGNORED_ANYWHERE.has(segment) || segment.startsWith('.'))
  }

  // Live updates: re-scan created/modified widget files, drop deleted ones. Best-effort — if
  // chokidar can't be resolved (pnpm), discovery still works from the startup scan, just not live.
  function startWatcher() {
    let chokidar
    try {
      chokidar = require('chokidar')
    } catch {
      try {
        const metroDir = path.dirname(require.resolve('metro/package.json', { paths: [projectRoot] }))
        chokidar = require(require.resolve('chokidar', { paths: [metroDir] }))
      } catch {
        console.warn('[voltra:metro] chokidar unavailable — widget discovery is startup-scan only (no live updates)')
        return
      }
    }

    watcher = chokidar.watch(projectRoot, {
      ignoreInitial: true,
      ignored: (candidate) => isIgnoredPath(candidate),
    })

    const onUpsert = (filePath) => {
      if (!SOURCE_EXT.test(filePath)) {
        return
      }
      try {
        scanFile(filePath)
      } catch (error) {
        console.error(`[voltra:metro] ${error.message}`)
      }
    }

    watcher.on('add', onUpsert)
    watcher.on('change', onUpsert)
    watcher.on('unlink', (filePath) => removeSourcePath(filePath))
  }

  scanProject()
  ready = true
  startWatcher()

  return {
    projectRoot,
    getWidget(widgetId) {
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

module.exports = { DuplicateVoltraWidgetError, createWidgetRegistry }