import crypto from 'node:crypto'
import fs from 'node:fs'
import path from 'node:path'

import {
  type DynamicWidgetManifest,
  type DynamicWidgetManifestWidget,
  type DynamicWidgetPlatform,
  validateHomeScreenWidgetId,
  validateWidgetEntry,
} from '@use-voltra/expo-plugin'

const MANIFEST_PLATFORMS = ['ios', 'android'] as const
const DEV_BARREL_PLATFORMS = MANIFEST_PLATFORMS

const RENDER_SHIM_BASENAME = 'voltra-render-shim'
const RENDER_SHIM_FILES: Record<string, string> = {
  [`${RENDER_SHIM_BASENAME}.ios.js`]:
    "export { renderVoltraVariantToJson as renderVariantToJson } from '@use-voltra/ios'\n",
  [`${RENDER_SHIM_BASENAME}.android.js`]:
    "export { renderAndroidVariantToJson as renderVariantToJson } from '@use-voltra/android'\n",
}

type PlatformState = {
  error: Error | null
  widgetsById: Map<string, RegisteredVoltraWidget>
  widgets: RegisteredVoltraWidget[]
}

export type RegisteredVoltraWidget = DynamicWidgetManifestWidget & {
  platform: DynamicWidgetPlatform
  manifestPath: string
  generatedEntryPath: string
  generatedEntryRelativePath: string
}

export type WidgetRegistry = {
  projectRoot: string
  getWidget(platform: DynamicWidgetPlatform, widgetId: string): RegisteredVoltraWidget | null
  isReady(): boolean
  listWidgets(platform?: DynamicWidgetPlatform): RegisteredVoltraWidget[]
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

function getManifestPath(projectRoot: string, platform: DynamicWidgetPlatform): string {
  return path.join(projectRoot, '.voltra', `manifest.${platform}.json`)
}

function createManifestErrorPrefix(projectRoot: string, manifestPath: string, platform: DynamicWidgetPlatform): string {
  return `Voltra dynamic widgets manifest at ${toPosixPath(path.relative(projectRoot, manifestPath))} for ${platform}`
}

export class MissingVoltraManifestError extends Error {
  constructor({
    projectRoot,
    manifestPath,
    platform,
  }: {
    projectRoot: string
    manifestPath: string
    platform: DynamicWidgetPlatform
  }) {
    super(
      `Missing Voltra dynamic widgets manifest for ${platform} at ${toPosixPath(
        path.relative(projectRoot, manifestPath)
      )}. Run Expo prebuild for ${platform} to generate it.`
    )

    this.name = 'MissingVoltraManifestError'
  }
}

export class InvalidVoltraManifestError extends Error {
  constructor({
    projectRoot,
    manifestPath,
    platform,
    reason,
  }: {
    projectRoot: string
    manifestPath: string
    platform: DynamicWidgetPlatform
    reason: string
  }) {
    super(`${createManifestErrorPrefix(projectRoot, manifestPath, platform)} is invalid: ${reason}`)

    this.name = 'InvalidVoltraManifestError'
  }
}

export class DuplicateVoltraWidgetError extends Error {
  constructor({
    projectRoot,
    manifestPath,
    platform,
    widgetId,
  }: {
    projectRoot: string
    manifestPath: string
    platform: DynamicWidgetPlatform
    widgetId: string
  }) {
    super(
      `${createManifestErrorPrefix(
        projectRoot,
        manifestPath,
        platform
      )} contains duplicate widget id "${widgetId}". Widget ids must be unique within a single platform manifest.`
    )

    this.name = 'DuplicateVoltraWidgetError'
  }
}

export function ensureEmptyDevBarrel(projectRoot: string): string {
  const generatedRoot = path.join(projectRoot, '.voltra', 'metro')
  const emptyBarrelPath = path.join(generatedRoot, 'widget-hot-reload.empty.js')
  ensureDirectory(generatedRoot)
  writeFileIfChanged(emptyBarrelPath, '// AUTO-GENERATED - empty Voltra widget hot-reload barrel.\n')
  return emptyBarrelPath
}

function ensureRenderShim(generatedRoot: string): void {
  ensureDirectory(generatedRoot)

  for (const [fileName, content] of Object.entries(RENDER_SHIM_FILES)) {
    writeFileIfChanged(path.join(generatedRoot, fileName), content)
  }
}

function normalizeImportPath(filePath: string): string {
  const normalized = toPosixPath(filePath)
  return normalized.startsWith('.') ? normalized : `./${normalized}`
}

function readJsonFile(filePath: string): unknown {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'))
}

function validateManifest(
  projectRoot: string,
  platform: DynamicWidgetPlatform,
  manifestPath: string,
  rawManifest: unknown
): DynamicWidgetManifest {
  if (!rawManifest || typeof rawManifest !== 'object' || Array.isArray(rawManifest)) {
    throw new InvalidVoltraManifestError({
      projectRoot,
      manifestPath,
      platform,
      reason: 'manifest root must be a JSON object',
    })
  }

  const manifest = rawManifest as Record<string, unknown>

  if (manifest.version !== 1) {
    throw new InvalidVoltraManifestError({
      projectRoot,
      manifestPath,
      platform,
      reason: `expected version 1, received ${JSON.stringify(manifest.version)}`,
    })
  }

  if (manifest.platform !== platform) {
    throw new InvalidVoltraManifestError({
      projectRoot,
      manifestPath,
      platform,
      reason: `expected platform "${platform}", received ${JSON.stringify(manifest.platform)}`,
    })
  }

  if (!Array.isArray(manifest.widgets)) {
    throw new InvalidVoltraManifestError({
      projectRoot,
      manifestPath,
      platform,
      reason: 'widgets must be an array',
    })
  }

  const widgetIds = new Set<string>()
  const widgets: DynamicWidgetManifestWidget[] = []

  for (const [index, value] of manifest.widgets.entries()) {
    if (!value || typeof value !== 'object' || Array.isArray(value)) {
      throw new InvalidVoltraManifestError({
        projectRoot,
        manifestPath,
        platform,
        reason: `widgets[${index}] must be an object with id and entry`,
      })
    }

    const widget = value as Record<string, unknown>

    if (typeof widget.id !== 'string' || !widget.id.trim()) {
      throw new InvalidVoltraManifestError({
        projectRoot,
        manifestPath,
        platform,
        reason: `widgets[${index}].id must be a non-empty string`,
      })
    }

    try {
      validateHomeScreenWidgetId(widget.id)
    } catch (error) {
      throw new InvalidVoltraManifestError({
        projectRoot,
        manifestPath,
        platform,
        reason: error instanceof Error ? error.message : String(error),
      })
    }

    if (widgetIds.has(widget.id)) {
      throw new DuplicateVoltraWidgetError({
        projectRoot,
        manifestPath,
        platform,
        widgetId: widget.id,
      })
    }

    widgetIds.add(widget.id)

    let entry: string
    try {
      entry = validateWidgetEntry(widget.entry, widget.id, projectRoot)
    } catch (error) {
      throw new InvalidVoltraManifestError({
        projectRoot,
        manifestPath,
        platform,
        reason: error instanceof Error ? error.message : String(error),
      })
    }

    widgets.push({
      id: widget.id,
      entry,
    })
  }

  return {
    version: 1,
    platform,
    widgets,
  }
}

function loadManifest(projectRoot: string, platform: DynamicWidgetPlatform): DynamicWidgetManifest {
  const manifestPath = getManifestPath(projectRoot, platform)

  if (!fs.existsSync(manifestPath)) {
    throw new MissingVoltraManifestError({ projectRoot, manifestPath, platform })
  }

  let rawManifest: unknown
  try {
    rawManifest = readJsonFile(manifestPath)
  } catch (error) {
    throw new InvalidVoltraManifestError({
      projectRoot,
      manifestPath,
      platform,
      reason: error instanceof Error ? error.message : String(error),
    })
  }

  try {
    return validateManifest(projectRoot, platform, manifestPath, rawManifest)
  } catch (error) {
    if (error instanceof Error) {
      throw error
    }

    throw new InvalidVoltraManifestError({
      projectRoot,
      manifestPath,
      platform,
      reason: String(error),
    })
  }
}

function createGeneratedEntry(
  projectRoot: string,
  generatedRoot: string,
  widget: RegisteredVoltraWidget
): Pick<RegisteredVoltraWidget, 'generatedEntryPath' | 'generatedEntryRelativePath'> {
  const generatedEntryRoot = path.join(generatedRoot, 'widgets')
  ensureDirectory(generatedEntryRoot)
  ensureRenderShim(generatedRoot)

  const entryFileName = `${widget.platform}-${safeFileName(widget.id)}-${hash(widget.entry)}.js`
  const generatedEntryPath = path.join(generatedEntryRoot, entryFileName)
  const entryImportPath = normalizeImportPath(path.relative(generatedEntryRoot, path.join(projectRoot, widget.entry)))
  const renderShimImportPath = normalizeImportPath(
    path.relative(generatedEntryRoot, path.join(generatedRoot, RENDER_SHIM_BASENAME))
  )

  const content = [
    "import { createElement } from 'react'",
    `import { renderVariantToJson } from ${JSON.stringify(renderShimImportPath)}`,
    `import Widget from ${JSON.stringify(entryImportPath)}`,
    '',
    `if (typeof Widget === 'undefined') {`,
    `  throw new Error(${JSON.stringify(
      `Voltra widget "${widget.id}" at "${widget.entry}" is missing a default export.`
    )})`,
    '}',
    '',
    'function parseJSONInput(input, label) {',
    '  if (typeof input !== "string") {',
    '    return input || {}',
    '  }',
    '  if (!input) {',
    '    return {}',
    '  }',
    '  try {',
    '    return JSON.parse(input)',
    '  } catch (error) {',
    `    throw new Error(\`Voltra widget "${widget.id}" failed to parse \${label}: \${error instanceof Error ? error.message : String(error)}\`)`,
    '  }',
    '}',
    '',
    'export function render(propsJSON, envJSON) {',
    '  const props = parseJSONInput(propsJSON, "propsJSON")',
    '  const env = parseJSONInput(envJSON, "envJSON")',
    '  const WidgetWithEnv = ({ __voltraProps }) => Widget(__voltraProps, env)',
    '  const resolved = renderVariantToJson(createElement(WidgetWithEnv, { __voltraProps: props }))',
    '  return JSON.stringify(resolved)',
    '}',
    '',
    'export default render',
    '',
  ].join('\n')

  writeFileIfChanged(generatedEntryPath, content)

  return {
    generatedEntryPath,
    generatedEntryRelativePath: toPosixPath(path.relative(projectRoot, generatedEntryPath)),
  }
}

function createPlatformBarrel(
  generatedRoot: string,
  platform: DynamicWidgetPlatform,
  widgets: RegisteredVoltraWidget[]
): void {
  const barrelPath = path.join(generatedRoot, `widget-hot-reload.${platform}.js`)
  const imports = widgets.map(
    (widget) => `import ${JSON.stringify(normalizeImportPath(path.relative(generatedRoot, widget.generatedEntryPath)))}`
  )

  const content = [
    '// AUTO-GENERATED - do not edit. Side-effect imports that place manifest-declared Voltra widgets in',
    '// the host app dependency graph so Metro Fast Refresh drives dev hot reload of widgets.',
    ...imports,
    '',
  ].join('\n')

  writeFileIfChanged(barrelPath, content)
}

function createEmptyPlatformState(): PlatformState {
  return {
    error: null,
    widgetsById: new Map(),
    widgets: [],
  }
}

export function createWidgetRegistry({ projectRoot = process.cwd() }: { projectRoot?: string } = {}): WidgetRegistry {
  const generatedRoot = path.join(projectRoot, '.voltra', 'metro')
  const platformStates: Record<DynamicWidgetPlatform, PlatformState> = {
    ios: createEmptyPlatformState(),
    android: createEmptyPlatformState(),
  }
  let ready = false

  function recordPlatformWidgets(platform: DynamicWidgetPlatform, widgets: RegisteredVoltraWidget[]): void {
    const state = platformStates[platform]
    state.error = null
    state.widgets = widgets
    state.widgetsById = new Map(widgets.map((widget) => [widget.id, widget]))
    createPlatformBarrel(generatedRoot, platform, widgets)
  }

  function recordPlatformError(platform: DynamicWidgetPlatform, error: Error): void {
    const state = platformStates[platform]
    state.error = error
    state.widgets = []
    state.widgetsById = new Map()
    createPlatformBarrel(generatedRoot, platform, [])
  }

  function refreshPlatform(platform: DynamicWidgetPlatform): void {
    try {
      const manifest = loadManifest(projectRoot, platform)
      const previousGeneratedPaths = new Set(
        platformStates[platform].widgets.map((widget) => widget.generatedEntryPath)
      )

      const widgets = manifest.widgets.map((widget) => {
        const baseWidget: RegisteredVoltraWidget = {
          platform,
          manifestPath: getManifestPath(projectRoot, platform),
          ...widget,
          generatedEntryPath: '',
          generatedEntryRelativePath: '',
        }

        return {
          ...baseWidget,
          ...createGeneratedEntry(projectRoot, generatedRoot, baseWidget),
        }
      })

      recordPlatformWidgets(platform, widgets)

      for (const stalePath of previousGeneratedPaths) {
        if (!widgets.some((widget) => widget.generatedEntryPath === stalePath)) {
          try {
            fs.rmSync(stalePath, { force: true })
          } catch {
            // Ignore stale cleanup failures.
          }
        }
      }
    } catch (error) {
      const normalizedError = error instanceof Error ? error : new Error(String(error))
      recordPlatformError(platform, normalizedError)
    }
  }

  ensureDirectory(generatedRoot)
  ensureEmptyDevBarrel(projectRoot)
  for (const platform of DEV_BARREL_PLATFORMS) {
    refreshPlatform(platform)
  }
  ready = true

  return {
    projectRoot,
    getWidget(platform: DynamicWidgetPlatform, widgetId: string) {
      const state = platformStates[platform]

      if (state.error) {
        throw state.error
      }

      return state.widgetsById.get(widgetId) || null
    },
    isReady() {
      return ready
    },
    listWidgets(platform?: DynamicWidgetPlatform) {
      if (platform) {
        const state = platformStates[platform]

        if (state.error) {
          throw state.error
        }

        return [...state.widgets]
      }

      return DEV_BARREL_PLATFORMS.flatMap((currentPlatform) => {
        const state = platformStates[currentPlatform]
        return state.error ? [] : state.widgets
      })
    },
    close() {},
  }
}
