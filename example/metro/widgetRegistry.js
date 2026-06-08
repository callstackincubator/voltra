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

function createWidgetRegistry({ projectRoot, onWidgetSourceChanged } = {}) {
  const generatedRoot = path.join(projectRoot, '.voltra', 'metro')
  const generatedEntryRoot = path.join(generatedRoot, 'entries')
  const widgetsById = new Map()
  const widgetIdsBySourcePath = new Map()
  // Track 5 — fs.watch handles keyed by absolute source path. We watch widget JSX files
  // directly because Metro's serializer hook only fires on full bundle serialization,
  // not on individual file saves (Fast Refresh patches in-place). Without this we'd
  // only push reloads when the widget extension happens to request a fresh bundle —
  // which is rate-limited to ~5 min by WidgetKit. fs.watch fires on every save,
  // independent of Metro's bundle pipeline.
  const fsWatchers = new Map()
  let ready = false

  function startWatching(sourcePath) {
    if (fsWatchers.has(sourcePath) || !onWidgetSourceChanged) {
      return
    }
    try {
      // `persistent: false` so the watcher doesn't keep the process alive on its own;
      // Metro's main loop holds the process. On editor saves, fs.watch fires once or
      // twice depending on how the editor writes — debounce in the pusher handles it.
      const watcher = fs.watch(sourcePath, { persistent: false }, (eventType) => {
        // eslint-disable-next-line no-console
        console.log(`[voltra-dev-push] fs.watch ${eventType} on ${path.basename(sourcePath)}`)
        onWidgetSourceChanged(sourcePath)
      })
      watcher.on('error', () => {
        // Editors sometimes rename the file during save, which can break the watcher.
        // Silently drop the entry so it gets re-attached on the next registry scan.
        watcher.close()
        fsWatchers.delete(sourcePath)
      })
      fsWatchers.set(sourcePath, watcher)
      // eslint-disable-next-line no-console
      console.log(`[voltra-dev-push] watching ${path.basename(sourcePath)}`)
    } catch (err) {
      // eslint-disable-next-line no-console
      console.warn(`[voltra-dev-push] fs.watch failed for ${sourcePath}: ${err.message}`)
    }
  }

  function stopWatching(sourcePath) {
    const watcher = fsWatchers.get(sourcePath)
    if (watcher) {
      watcher.close()
      fsWatchers.delete(sourcePath)
    }
  }

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
    stopWatching(sourcePath)
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
    startWatching(sourcePath)

    return registered
  }

  function scanSource({ filePath, source }) {
    const widgets = scanVoltraDirectives({
      filePath,
      source,
    })

    return registerWidgets(filePath, widgets)
  }

  function scanModule(module) {
    try {
      return scanSource({
        filePath: module.path,
        source: module.getSource().toString('utf8'),
      })
    } catch (error) {
      if (error instanceof DuplicateVoltraWidgetError) {
        throw error
      }

      console.warn(`[voltra:metro] Failed to scan ${module.path}: ${error.message}`)
      removeSourcePath(module.path)
      return []
    }
  }

  function scanModuleMap(modules) {
    if (!modules) {
      return
    }

    for (const module of modules.values()) {
      scanModule(module)
    }
  }

  return {
    projectRoot,
    applyMetroDelta(delta) {
      if (delta.deleted) {
        for (const deletedPath of delta.deleted) {
          removeSourcePath(deletedPath)
        }
      }

      scanModuleMap(delta.added)
      scanModuleMap(delta.modified)
      // NOTE on dev-reload firing: we do NOT trigger `onWidgetSourceChanged` from here.
      // `experimentalSerializerHook` (the caller of applyMetroDelta) only fires on full
      // bundle serializations — Fast Refresh applies module patches in-place without
      // re-serializing, so saves don't reach this code path. Instead, registerWidgets
      // attaches an `fs.watch` to each widget JSX file's absolute path (`startWatching`),
      // and the watcher fires `onWidgetSourceChanged` directly on every save —
      // independent of Metro's bundle pipeline.
      ready = true
    },
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
  }
}

module.exports = { DuplicateVoltraWidgetError, createWidgetRegistry }
