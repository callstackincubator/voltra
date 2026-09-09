import path from 'node:path'

import { resolveFromRoot } from '../fs/path'
import { CLI_DEFAULTS } from './defaults'
import { isPerConfigurationMap } from './perConfiguration'
import { resolveServerUpdateInterval, resolveServerUpdateUrl, validateServerUpdateRefresh } from './serverUpdate'

import type { PerConfiguration } from './perConfiguration'

import type {
  AndroidWidgetAppIntentConfig,
  AndroidWidgetConfig,
  IOSWidgetAppIntentConfig,
  IOSWidgetConfig,
  LoadedVoltraConfig,
  NormalizedAndroidWidgetConfig,
  NormalizedWidgetServerUpdateConfig,
  NormalizedVoltraAndroidConfig,
  NormalizedVoltraConfig,
  NormalizedVoltraIOSConfig,
  NormalizedIOSWidgetConfig,
  WidgetInitialStatePath,
  WidgetLabel,
  WidgetLocalizedValue,
} from './types'

const VALID_IOS_WIDGET_FAMILIES = new Set([
  'systemSmall',
  'systemMedium',
  'systemLarge',
  'systemExtraLarge',
  'accessoryCircular',
  'accessoryRectangular',
  'accessoryInline',
])
const WIDGET_ENTRY_EXTENSIONS = new Set(['.js', '.jsx', '.ts', '.tsx', '.mjs', '.cjs'])

export class VoltraConfigNormalizationError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'VoltraConfigNormalizationError'
  }
}

function assertObject(value: unknown, context: string): void {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new VoltraConfigNormalizationError(`${context} must be an object`)
  }
}

function assertRecord(value: unknown, context: string): asserts value is Record<string, unknown> {
  assertObject(value, context)
}

function assertOptionalString(value: unknown, context: string): asserts value is string | undefined {
  if (value !== undefined && typeof value !== 'string') {
    throw new VoltraConfigNormalizationError(`${context} must be a string`)
  }
}

function assertOptionalPerConfigurationString(
  value: unknown,
  context: string
): asserts value is PerConfiguration<string> | undefined {
  if (value === undefined || typeof value === 'string') {
    return
  }

  if (!isPerConfigurationMap(value as PerConfiguration<unknown>)) {
    throw new VoltraConfigNormalizationError(
      `${context} must be a string, or an object of strings keyed by build configuration name`
    )
  }

  const entries = Object.entries(value as Record<string, unknown>)

  if (entries.length === 0) {
    throw new VoltraConfigNormalizationError(`${context} must not be an empty object`)
  }

  for (const [buildConfigurationName, configurationValue] of entries) {
    if (typeof configurationValue !== 'string' || !configurationValue.trim()) {
      throw new VoltraConfigNormalizationError(`${context}.${buildConfigurationName} must be a non-empty string`)
    }
  }
}

function assertOptionalBoolean(value: unknown, context: string): asserts value is boolean | undefined {
  if (value !== undefined && typeof value !== 'boolean') {
    throw new VoltraConfigNormalizationError(`${context} must be a boolean`)
  }
}

function assertPositiveInteger(value: unknown, context: string): asserts value is number {
  if (typeof value !== 'number' || !Number.isInteger(value) || value < 1) {
    throw new VoltraConfigNormalizationError(`${context} must be a positive integer`)
  }
}

function assertOptionalPositiveInteger(value: unknown, context: string): asserts value is number | undefined {
  if (value !== undefined) {
    assertPositiveInteger(value, context)
  }
}

function assertNonEmptyString(value: unknown, context: string): asserts value is string {
  if (typeof value !== 'string' || !value.trim()) {
    throw new VoltraConfigNormalizationError(`${context} must be a non-empty string`)
  }
}

function assertOptionalStringArray(value: unknown, context: string): asserts value is string[] | undefined {
  if (value === undefined) {
    return
  }

  if (!Array.isArray(value)) {
    throw new VoltraConfigNormalizationError(`${context} must be an array of strings`)
  }

  for (const entry of value) {
    if (typeof entry !== 'string' || !entry.trim()) {
      throw new VoltraConfigNormalizationError(`${context} must contain only non-empty strings`)
    }
  }
}

function resolvePathFromProjectRoot(projectRoot: string, filePath: string): string {
  return path.isAbsolute(filePath) ? filePath : resolveFromRoot(projectRoot, filePath)
}

function resolveOptionalPathFromProjectRoot(projectRoot: string, filePath: string | undefined): string | undefined {
  if (!filePath) {
    return undefined
  }

  return resolvePathFromProjectRoot(projectRoot, filePath)
}

function resolveOptionalPerConfigurationPath(
  projectRoot: string,
  filePath: PerConfiguration<string> | undefined
): PerConfiguration<string> | undefined {
  if (!filePath) {
    return undefined
  }

  if (!isPerConfigurationMap(filePath)) {
    return resolvePathFromProjectRoot(projectRoot, filePath)
  }

  return Object.fromEntries(
    Object.entries(filePath).map(([buildConfigurationName, configurationPath]) => [
      buildConfigurationName,
      resolvePathFromProjectRoot(projectRoot, configurationPath),
    ])
  )
}

function isAbsoluteWidgetPath(value: string): boolean {
  return path.isAbsolute(value) || path.win32.isAbsolute(value) || /^[a-zA-Z]:[\\/]/.test(value)
}

function normalizeWidgetEntry(entry: string): string {
  return path.posix.normalize(entry.replace(/\\/g, '/'))
}

function normalizeWidgetEntryPath(entry: string): string {
  return normalizeWidgetEntry(entry)
}

function normalizeOptionalWidgetEntry(value: unknown, context: string): string | undefined {
  if (value === undefined) {
    return undefined
  }

  assertNonEmptyString(value, context)

  if (isAbsoluteWidgetPath(value)) {
    throw new VoltraConfigNormalizationError(`${context} must be a relative path, not an absolute path`)
  }

  const normalizedEntry = normalizeWidgetEntryPath(value)

  if (!normalizedEntry || normalizedEntry === '.') {
    throw new VoltraConfigNormalizationError(`${context} must point to a file inside the project root`)
  }

  if (normalizedEntry === '..' || normalizedEntry.startsWith('../')) {
    throw new VoltraConfigNormalizationError(`${context} must stay within the project root after normalization`)
  }

  const extension = path.posix.extname(normalizedEntry)
  if (!WIDGET_ENTRY_EXTENSIONS.has(extension)) {
    throw new VoltraConfigNormalizationError(
      `${context} must use a Metro-importable source extension (${Array.from(WIDGET_ENTRY_EXTENSIONS).join(
        ', '
      )}); received '${extension || '(none)'}'`
    )
  }

  return normalizedEntry
}

function normalizeLocalizedPathMap(
  projectRoot: string,
  value: WidgetLocalizedValue,
  context: string
): WidgetLocalizedValue {
  const entries = Object.entries(value)

  if (entries.length === 0) {
    throw new VoltraConfigNormalizationError(`${context} must not be empty`)
  }

  return Object.fromEntries(
    entries.map(([locale, localePath]) => {
      assertNonEmptyString(locale, `${context} locale key`)
      assertNonEmptyString(localePath, `${context}.${locale}`)
      return [locale, resolvePathFromProjectRoot(projectRoot, localePath)]
    })
  )
}

function normalizeLabel(value: WidgetLabel, context: string): WidgetLabel {
  if (typeof value === 'string') {
    assertNonEmptyString(value, context)
    return value
  }

  assertRecord(value, context)

  const entries = Object.entries(value)
  if (entries.length === 0) {
    throw new VoltraConfigNormalizationError(`${context} must not be empty`)
  }

  return Object.fromEntries(
    entries.map(([locale, label]) => {
      assertNonEmptyString(locale, `${context} locale key`)
      if (typeof label !== 'string') {
        throw new VoltraConfigNormalizationError(`${context}.${locale} must be a string`)
      }
      assertNonEmptyString(label, `${context}.${locale}`)
      return [locale, label]
    })
  )
}

function normalizeInitialStatePath(
  projectRoot: string,
  value: WidgetInitialStatePath | undefined,
  context: string
): WidgetInitialStatePath | undefined {
  if (value === undefined) {
    return undefined
  }

  if (typeof value === 'string') {
    assertNonEmptyString(value, context)
    return resolvePathFromProjectRoot(projectRoot, value)
  }

  assertRecord(value, context)
  return normalizeLocalizedPathMap(projectRoot, value, context)
}

function normalizeWidgetParameterName(value: unknown, context: string): string {
  assertNonEmptyString(value, context)
  return value
}

function normalizeAndroidAppIntent(
  value: AndroidWidgetAppIntentConfig | undefined,
  context: string
): AndroidWidgetAppIntentConfig | undefined {
  if (value === undefined) {
    return undefined
  }

  assertObject(value, context)

  if (!Array.isArray(value.parameters)) {
    throw new VoltraConfigNormalizationError(`${context}.parameters must be an array`)
  }

  const seenNames = new Set<string>()
  const parameters = value.parameters.map((parameter, index) => {
    const parameterContext = `${context}.parameters[${index}]`
    assertObject(parameter, parameterContext)
    const name = normalizeWidgetParameterName(parameter.name, `${parameterContext}.name`)
    assertOptionalString(parameter.title, `${parameterContext}.title`)
    assertOptionalString(parameter.default, `${parameterContext}.default`)

    if (seenNames.has(name)) {
      throw new VoltraConfigNormalizationError(`${context}.parameters contains duplicate name '${name}'`)
    }

    seenNames.add(name)

    return {
      name,
      title: parameter.title,
      default: parameter.default,
    }
  })

  return { parameters }
}

function normalizeIOSAppIntent(
  value: IOSWidgetAppIntentConfig | undefined,
  context: string
): IOSWidgetAppIntentConfig | undefined {
  if (value === undefined) {
    return undefined
  }

  assertObject(value, context)

  if (!Array.isArray(value.parameters)) {
    throw new VoltraConfigNormalizationError(`${context}.parameters must be an array`)
  }

  const seenNames = new Set<string>()
  const parameters = value.parameters.map((parameter, index) => {
    const parameterContext = `${context}.parameters[${index}]`
    assertObject(parameter, parameterContext)
    const name = normalizeWidgetParameterName(parameter.name, `${parameterContext}.name`)
    assertNonEmptyString(parameter.title, `${parameterContext}.title`)
    assertOptionalString(parameter.default, `${parameterContext}.default`)

    if (seenNames.has(name)) {
      throw new VoltraConfigNormalizationError(`${context}.parameters contains duplicate name '${name}'`)
    }

    seenNames.add(name)

    return {
      name,
      title: parameter.title,
      default: parameter.default,
    }
  })

  return { parameters }
}

interface NormalizeServerUpdateOptions {
  context: string
  /** True when the widget has an `entry`, so the response is props rather than a payload. */
  hasEntry: boolean
  defaultIntervalMinutes: number
  defaultRefresh: boolean
  minimumIntervalMinutes: number
  warnings: string[]
}

function normalizeServerUpdate(
  serverUpdate: { url?: string; intervalMinutes?: number; refresh?: boolean },
  options: NormalizeServerUpdateOptions
): NormalizedWidgetServerUpdateConfig {
  const { context, hasEntry, defaultIntervalMinutes, defaultRefresh, minimumIntervalMinutes, warnings } = options

  assertObject(serverUpdate, context)

  const url = resolveServerUpdateUrl(serverUpdate.url, context)

  if (url.kind === 'invalid') {
    throw new VoltraConfigNormalizationError(url.error)
  }

  if (url.kind === 'insecure') {
    warnings.push(url.warning)
  }

  const interval = resolveServerUpdateInterval({
    intervalMinutes: serverUpdate.intervalMinutes,
    context,
    hasEntry,
    defaultIntervalMinutes,
    minimumIntervalMinutes,
  })

  if (interval.kind === 'invalid') {
    throw new VoltraConfigNormalizationError(interval.error)
  }

  if (interval.kind === 'clamped') {
    warnings.push(interval.warning)
  }

  const refreshError = validateServerUpdateRefresh(serverUpdate.refresh, context)

  if (refreshError) {
    throw new VoltraConfigNormalizationError(refreshError)
  }

  return {
    url: serverUpdate.url,
    intervalMinutes: interval.intervalMinutes,
    refresh: serverUpdate.refresh ?? defaultRefresh,
  }
}

function normalizeAndroidWidget(
  projectRoot: string,
  widget: AndroidWidgetConfig,
  warnings: string[]
): NormalizedAndroidWidgetConfig {
  assertObject(widget, 'android.widgets[]')
  assertNonEmptyString(widget.id, 'android.widgets[].id')
  assertValidWidgetId(widget.id, 'android.widgets[].id')
  assertPositiveInteger(widget.targetCellWidth, `android.widgets[${widget.id}].targetCellWidth`)
  assertPositiveInteger(widget.targetCellHeight, `android.widgets[${widget.id}].targetCellHeight`)
  assertOptionalPositiveInteger(widget.minCellWidth, `android.widgets[${widget.id}].minCellWidth`)
  assertOptionalPositiveInteger(widget.minCellHeight, `android.widgets[${widget.id}].minCellHeight`)
  assertOptionalPositiveInteger(widget.minWidth, `android.widgets[${widget.id}].minWidth`)
  assertOptionalPositiveInteger(widget.minHeight, `android.widgets[${widget.id}].minHeight`)
  assertOptionalPositiveInteger(widget.minResizeWidth, `android.widgets[${widget.id}].minResizeWidth`)
  assertOptionalPositiveInteger(widget.minResizeHeight, `android.widgets[${widget.id}].minResizeHeight`)
  assertOptionalPositiveInteger(widget.maxResizeWidth, `android.widgets[${widget.id}].maxResizeWidth`)
  assertOptionalPositiveInteger(widget.maxResizeHeight, `android.widgets[${widget.id}].maxResizeHeight`)

  return {
    ...widget,
    displayName: normalizeLabel(widget.displayName, `android.widgets[${widget.id}].displayName`),
    description: normalizeLabel(widget.description, `android.widgets[${widget.id}].description`),
    entry: normalizeOptionalWidgetEntry(widget.entry, `android.widgets[${widget.id}].entry`),
    initialStatePath: normalizeInitialStatePath(
      projectRoot,
      widget.initialStatePath,
      `android.widgets[${widget.id}].initialStatePath`
    ),
    previewImage: resolveOptionalPathFromProjectRoot(projectRoot, widget.previewImage),
    previewLayout: resolveOptionalPathFromProjectRoot(projectRoot, widget.previewLayout),
    appIntent: normalizeAndroidAppIntent(widget.appIntent, `android.widgets[${widget.id}].appIntent`),
    serverUpdate: widget.serverUpdate
      ? normalizeServerUpdate(widget.serverUpdate, {
          context: `android.widgets[${widget.id}].serverUpdate`,
          hasEntry: widget.entry !== undefined,
          defaultIntervalMinutes: CLI_DEFAULTS.android.serverUpdateIntervalMinutes,
          defaultRefresh: CLI_DEFAULTS.android.serverUpdateRefresh,
          minimumIntervalMinutes: 15,
          warnings,
        })
      : undefined,
  }
}

function normalizeIOSWidget(
  projectRoot: string,
  widget: IOSWidgetConfig,
  warnings: string[]
): NormalizedIOSWidgetConfig {
  assertObject(widget, 'ios.widgets[]')
  assertNonEmptyString(widget.id, 'ios.widgets[].id')
  assertValidWidgetId(widget.id, 'ios.widgets[].id')

  if (widget.supportedFamilies !== undefined) {
    if (!Array.isArray(widget.supportedFamilies)) {
      throw new VoltraConfigNormalizationError(`ios.widgets[${widget.id}].supportedFamilies must be an array`)
    }

    for (const family of widget.supportedFamilies) {
      if (!VALID_IOS_WIDGET_FAMILIES.has(family)) {
        throw new VoltraConfigNormalizationError(
          `ios.widgets[${widget.id}].supportedFamilies contains invalid family '${family}'`
        )
      }
    }
  }

  return {
    ...widget,
    displayName: normalizeLabel(widget.displayName, `ios.widgets[${widget.id}].displayName`),
    description: normalizeLabel(widget.description, `ios.widgets[${widget.id}].description`),
    supportedFamilies: widget.supportedFamilies ?? [...CLI_DEFAULTS.ios.widgetFamilies],
    entry: normalizeOptionalWidgetEntry(widget.entry, `ios.widgets[${widget.id}].entry`),
    initialStatePath: normalizeInitialStatePath(
      projectRoot,
      widget.initialStatePath,
      `ios.widgets[${widget.id}].initialStatePath`
    ),
    appIntent: normalizeIOSAppIntent(widget.appIntent, `ios.widgets[${widget.id}].appIntent`),
    serverUpdate: widget.serverUpdate
      ? normalizeServerUpdate(widget.serverUpdate, {
          context: `ios.widgets[${widget.id}].serverUpdate`,
          hasEntry: widget.entry !== undefined,
          defaultIntervalMinutes: CLI_DEFAULTS.ios.serverUpdateIntervalMinutes,
          defaultRefresh: CLI_DEFAULTS.ios.serverUpdateRefresh,
          minimumIntervalMinutes: 1,
          warnings,
        })
      : undefined,
  }
}

function assertUniqueWidgetIds(widgetIds: string[], context: string): void {
  const seen = new Set<string>()

  for (const widgetId of widgetIds) {
    if (seen.has(widgetId)) {
      throw new VoltraConfigNormalizationError(`Duplicate ${context} widget ID '${widgetId}'`)
    }

    seen.add(widgetId)
  }
}

function assertValidWidgetId(widgetId: string, context: string): void {
  if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(widgetId)) {
    throw new VoltraConfigNormalizationError(
      `${context} must start with a letter or underscore and contain only alphanumeric characters and underscores`
    )
  }
}

function assertValidIOSTargetName(targetName: string, context: string): void {
  if (!/^[A-Za-z][A-Za-z0-9_]*$/.test(targetName)) {
    throw new VoltraConfigNormalizationError(
      `${context} must start with a letter and contain only letters, numbers, and underscores`
    )
  }
}

function normalizeAndroidConfig(
  warnings: string[],
  projectRoot: string,
  config: LoadedVoltraConfig['config']['android']
): NormalizedVoltraAndroidConfig | undefined {
  if (config === undefined) {
    return undefined
  }

  assertObject(config, 'android')
  assertOptionalBoolean(config.enableNotifications, 'android.enableNotifications')
  assertOptionalStringArray(config.fonts, 'android.fonts')
  assertOptionalString(config.userImagesPath, 'android.userImagesPath')

  if (config.project !== undefined) {
    assertObject(config.project, 'android.project')
    assertOptionalString(config.project.rootDir, 'android.project.rootDir')
    assertOptionalString(config.project.appModuleName, 'android.project.appModuleName')
    assertOptionalString(config.project.manifestPath, 'android.project.manifestPath')
    assertOptionalString(config.project.packageName, 'android.project.packageName')
  }

  if (config.widgets !== undefined && !Array.isArray(config.widgets)) {
    throw new VoltraConfigNormalizationError('android.widgets must be an array')
  }

  const widgets = (config.widgets ?? []).map((widget) => normalizeAndroidWidget(projectRoot, widget, warnings))
  assertUniqueWidgetIds(
    widgets.map((widget) => widget.id),
    'android'
  )

  return {
    enableNotifications: config.enableNotifications ?? CLI_DEFAULTS.android.enableNotifications,
    widgets,
    fonts: (config.fonts ?? []).map((fontPath) => resolvePathFromProjectRoot(projectRoot, fontPath)),
    userImagesPath: resolvePathFromProjectRoot(
      projectRoot,
      config.userImagesPath ?? CLI_DEFAULTS.android.userImagesPath
    ),
    project: {
      rootDir: resolveOptionalPathFromProjectRoot(projectRoot, config.project?.rootDir),
      appModuleName: config.project?.appModuleName,
      manifestPath: resolveOptionalPathFromProjectRoot(projectRoot, config.project?.manifestPath),
      packageName: config.project?.packageName,
    },
  }
}

function normalizeIOSConfig(
  warnings: string[],
  projectRoot: string,
  config: LoadedVoltraConfig['config']['ios']
): NormalizedVoltraIOSConfig | undefined {
  if (config === undefined) {
    return undefined
  }

  assertObject(config, 'ios')
  assertOptionalBoolean(config.enablePushNotifications, 'ios.enablePushNotifications')
  assertOptionalPerConfigurationString(config.groupIdentifier, 'ios.groupIdentifier')
  assertOptionalString(config.deploymentTarget, 'ios.deploymentTarget')
  assertOptionalString(config.targetName, 'ios.targetName')
  assertOptionalStringArray(config.fonts, 'ios.fonts')
  assertOptionalString(config.userImagesPath, 'ios.userImagesPath')
  assertOptionalPerConfigurationString(config.keychainGroup, 'ios.keychainGroup')

  if (config.project !== undefined) {
    assertObject(config.project, 'ios.project')
    assertOptionalString(config.project.rootDir, 'ios.project.rootDir')
    assertOptionalString(config.project.xcodeprojPath, 'ios.project.xcodeprojPath')
    assertOptionalString(config.project.mainTargetName, 'ios.project.mainTargetName')
    assertOptionalString(config.project.infoPlistPath, 'ios.project.infoPlistPath')
    assertOptionalPerConfigurationString(config.project.entitlementsPath, 'ios.project.entitlementsPath')
    assertOptionalString(config.project.podfilePath, 'ios.project.podfilePath')
  }

  if (config.widgets !== undefined && !Array.isArray(config.widgets)) {
    throw new VoltraConfigNormalizationError('ios.widgets must be an array')
  }

  if (config.targetName !== undefined) {
    assertValidIOSTargetName(config.targetName, 'ios.targetName')
  }

  const widgets = (config.widgets ?? []).map((widget) => normalizeIOSWidget(projectRoot, widget, warnings))
  assertUniqueWidgetIds(
    widgets.map((widget) => widget.id),
    'ios'
  )

  return {
    enablePushNotifications: config.enablePushNotifications ?? CLI_DEFAULTS.ios.enablePushNotifications,
    groupIdentifier: config.groupIdentifier,
    widgets,
    deploymentTarget: config.deploymentTarget ?? CLI_DEFAULTS.ios.deploymentTarget,
    targetName: config.targetName,
    fonts: (config.fonts ?? []).map((fontPath) => resolvePathFromProjectRoot(projectRoot, fontPath)),
    userImagesPath: resolvePathFromProjectRoot(projectRoot, config.userImagesPath ?? CLI_DEFAULTS.ios.userImagesPath),
    keychainGroup: config.keychainGroup,
    project: {
      rootDir: resolveOptionalPathFromProjectRoot(projectRoot, config.project?.rootDir),
      xcodeprojPath: resolveOptionalPathFromProjectRoot(projectRoot, config.project?.xcodeprojPath),
      mainTargetName: config.project?.mainTargetName,
      infoPlistPath: resolveOptionalPathFromProjectRoot(projectRoot, config.project?.infoPlistPath),
      entitlementsPath: resolveOptionalPerConfigurationPath(projectRoot, config.project?.entitlementsPath),
      podfilePath: resolveOptionalPathFromProjectRoot(projectRoot, config.project?.podfilePath),
    },
  }
}

export function normalizeVoltraConfig(loadedConfig: LoadedVoltraConfig): NormalizedVoltraConfig {
  assertObject(loadedConfig.config, 'config')
  assertOptionalString(loadedConfig.config.projectRoot, 'projectRoot')

  const projectRoot = resolvePathFromProjectRoot(
    loadedConfig.configDir,
    loadedConfig.config.projectRoot ?? loadedConfig.configDir
  )

  const warnings: string[] = []
  const android = normalizeAndroidConfig(warnings, projectRoot, loadedConfig.config.android)
  const ios = normalizeIOSConfig(warnings, projectRoot, loadedConfig.config.ios)

  assertServerDrivenDynamicWidgetsAreSupported(ios)

  return {
    configPath: loadedConfig.configPath,
    configDir: loadedConfig.configDir,
    projectRoot,
    android,
    ios,
    warnings,
  }
}

/**
 * A Dynamic Widget commits fetched props to the App Group so the widget extension can read them,
 * so a server-driven one without a `groupIdentifier` would fetch and have nowhere to put the
 * result.
 */
function assertServerDrivenDynamicWidgetsAreSupported(ios: NormalizedVoltraIOSConfig | undefined): void {
  if (ios === undefined || ios.groupIdentifier !== undefined) {
    return
  }

  for (const widget of ios.widgets) {
    if (widget.entry !== undefined && widget.serverUpdate !== undefined) {
      throw new VoltraConfigNormalizationError(
        `ios.widgets[${widget.id}] has both entry and serverUpdate, which requires ios.groupIdentifier ` +
          'so fetched props can be shared with the widget extension.'
      )
    }
  }
}
