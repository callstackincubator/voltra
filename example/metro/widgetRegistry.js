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

function createWidgetRegistry({ projectRoot }) {
  const generatedRoot = path.join(projectRoot, '.voltra', 'metro')
  const generatedEntryRoot = path.join(generatedRoot, 'entries')
  const widgetsById = new Map()
  const widgetIdsBySourcePath = new Map()
  let ready = false

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
        '// `env` is captured at draw time by Swift / Kotlin and passed across the JSC / Hermes',
        '// boundary; closure-passed into the widget function because createElement does not',
        '// accept extra positional args.',
        'export function render(props = {}, env = {}) {',
        '  const WidgetWithEnv = (forwardedProps) => Widget(forwardedProps, env)',
        '  return renderVoltraVariantToJson(createElement(WidgetWithEnv, props))',
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
