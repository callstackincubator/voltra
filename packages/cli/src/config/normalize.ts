import path from 'node:path'

import { resolveFromRoot } from '../fs/path'
import { CLI_DEFAULTS } from './defaults'

import type {
  AndroidWidgetConfig,
  IOSWidgetConfig,
  LoadedVoltraConfig,
  NormalizedAndroidWidgetConfig,
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

function assertOptionalBoolean(value: unknown, context: string): asserts value is boolean | undefined {
  if (value !== undefined && typeof value !== 'boolean') {
    throw new VoltraConfigNormalizationError(`${context} must be a boolean`)
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

function normalizeLocalizedPathMap(projectRoot: string, value: WidgetLocalizedValue, context: string): WidgetLocalizedValue {
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

function normalizeServerUpdate(
  serverUpdate: { url: string; intervalMinutes?: number; refresh?: boolean },
  context: string,
  defaultIntervalMinutes: number,
  defaultRefresh: boolean,
  minimumIntervalMinutes: number
): { url: string; intervalMinutes: number; refresh: boolean } {
  assertObject(serverUpdate, context)
  assertNonEmptyString(serverUpdate.url, `${context}.url`)

  if (serverUpdate.intervalMinutes !== undefined) {
    if (typeof serverUpdate.intervalMinutes !== 'number' || !Number.isFinite(serverUpdate.intervalMinutes)) {
      throw new VoltraConfigNormalizationError(`${context}.intervalMinutes must be a number`)
    }

    if (!Number.isInteger(serverUpdate.intervalMinutes)) {
      throw new VoltraConfigNormalizationError(`${context}.intervalMinutes must be an integer`)
    }

    if (serverUpdate.intervalMinutes < minimumIntervalMinutes) {
      throw new VoltraConfigNormalizationError(`${context}.intervalMinutes must be at least ${minimumIntervalMinutes}`)
    }
  }

  if (serverUpdate.refresh !== undefined && typeof serverUpdate.refresh !== 'boolean') {
    throw new VoltraConfigNormalizationError(`${context}.refresh must be a boolean`)
  }

  return {
    url: serverUpdate.url,
    intervalMinutes: serverUpdate.intervalMinutes ?? defaultIntervalMinutes,
    refresh: serverUpdate.refresh ?? defaultRefresh,
  }
}

function normalizeAndroidWidget(projectRoot: string, widget: AndroidWidgetConfig): NormalizedAndroidWidgetConfig {
  assertObject(widget, 'android.widgets[]')
  assertNonEmptyString(widget.id, 'android.widgets[].id')
  assertValidWidgetId(widget.id, 'android.widgets[].id')

  return {
    ...widget,
    displayName: normalizeLabel(widget.displayName, `android.widgets[${widget.id}].displayName`),
    description: normalizeLabel(widget.description, `android.widgets[${widget.id}].description`),
    initialStatePath: normalizeInitialStatePath(projectRoot, widget.initialStatePath, `android.widgets[${widget.id}].initialStatePath`),
    previewImage: resolveOptionalPathFromProjectRoot(projectRoot, widget.previewImage),
    previewLayout: resolveOptionalPathFromProjectRoot(projectRoot, widget.previewLayout),
    serverUpdate: widget.serverUpdate
      ? normalizeServerUpdate(
          widget.serverUpdate,
          `android.widgets[${widget.id}].serverUpdate`,
          CLI_DEFAULTS.android.serverUpdateIntervalMinutes,
          CLI_DEFAULTS.android.serverUpdateRefresh,
          15
        )
      : undefined,
  }
}

function normalizeIOSWidget(projectRoot: string, widget: IOSWidgetConfig): NormalizedIOSWidgetConfig {
  assertObject(widget, 'ios.widgets[]')
  assertNonEmptyString(widget.id, 'ios.widgets[].id')
  assertValidWidgetId(widget.id, 'ios.widgets[].id')

  if (widget.supportedFamilies !== undefined) {
    if (!Array.isArray(widget.supportedFamilies)) {
      throw new VoltraConfigNormalizationError(`ios.widgets[${widget.id}].supportedFamilies must be an array`)
    }

    for (const family of widget.supportedFamilies) {
      if (!VALID_IOS_WIDGET_FAMILIES.has(family)) {
        throw new VoltraConfigNormalizationError(`ios.widgets[${widget.id}].supportedFamilies contains invalid family '${family}'`)
      }
    }
  }

  return {
    ...widget,
    displayName: normalizeLabel(widget.displayName, `ios.widgets[${widget.id}].displayName`),
    description: normalizeLabel(widget.description, `ios.widgets[${widget.id}].description`),
    supportedFamilies: widget.supportedFamilies ?? [...CLI_DEFAULTS.ios.widgetFamilies],
    initialStatePath: normalizeInitialStatePath(projectRoot, widget.initialStatePath, `ios.widgets[${widget.id}].initialStatePath`),
    serverUpdate: widget.serverUpdate
      ? normalizeServerUpdate(
          widget.serverUpdate,
          `ios.widgets[${widget.id}].serverUpdate`,
          CLI_DEFAULTS.ios.serverUpdateIntervalMinutes,
          CLI_DEFAULTS.ios.serverUpdateRefresh,
          1
        )
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

function normalizeAndroidConfig(projectRoot: string, config: LoadedVoltraConfig['config']['android']): NormalizedVoltraAndroidConfig | undefined {
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

  const widgets = (config.widgets ?? []).map((widget) => normalizeAndroidWidget(projectRoot, widget))
  assertUniqueWidgetIds(
    widgets.map((widget) => widget.id),
    'android'
  )

  return {
    enableNotifications: config.enableNotifications ?? CLI_DEFAULTS.android.enableNotifications,
    widgets,
    fonts: (config.fonts ?? []).map((fontPath) => resolvePathFromProjectRoot(projectRoot, fontPath)),
    userImagesPath: resolvePathFromProjectRoot(projectRoot, config.userImagesPath ?? CLI_DEFAULTS.android.userImagesPath),
    project: {
      rootDir: resolveOptionalPathFromProjectRoot(projectRoot, config.project?.rootDir),
      appModuleName: config.project?.appModuleName,
      manifestPath: resolveOptionalPathFromProjectRoot(projectRoot, config.project?.manifestPath),
      packageName: config.project?.packageName,
    },
  }
}

function normalizeIOSConfig(projectRoot: string, config: LoadedVoltraConfig['config']['ios']): NormalizedVoltraIOSConfig | undefined {
  if (config === undefined) {
    return undefined
  }

  assertObject(config, 'ios')
  assertOptionalBoolean(config.enablePushNotifications, 'ios.enablePushNotifications')
  assertOptionalString(config.groupIdentifier, 'ios.groupIdentifier')
  assertOptionalString(config.deploymentTarget, 'ios.deploymentTarget')
  assertOptionalString(config.targetName, 'ios.targetName')
  assertOptionalStringArray(config.fonts, 'ios.fonts')
  assertOptionalString(config.userImagesPath, 'ios.userImagesPath')
  assertOptionalString(config.keychainGroup, 'ios.keychainGroup')

  if (config.project !== undefined) {
    assertObject(config.project, 'ios.project')
    assertOptionalString(config.project.rootDir, 'ios.project.rootDir')
    assertOptionalString(config.project.xcodeprojPath, 'ios.project.xcodeprojPath')
    assertOptionalString(config.project.mainTargetName, 'ios.project.mainTargetName')
    assertOptionalString(config.project.infoPlistPath, 'ios.project.infoPlistPath')
    assertOptionalString(config.project.entitlementsPath, 'ios.project.entitlementsPath')
    assertOptionalString(config.project.podfilePath, 'ios.project.podfilePath')
  }

  if (config.widgets !== undefined && !Array.isArray(config.widgets)) {
    throw new VoltraConfigNormalizationError('ios.widgets must be an array')
  }

  if (config.targetName !== undefined) {
    assertValidIOSTargetName(config.targetName, 'ios.targetName')
  }

  const widgets = (config.widgets ?? []).map((widget) => normalizeIOSWidget(projectRoot, widget))
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
      entitlementsPath: resolveOptionalPathFromProjectRoot(projectRoot, config.project?.entitlementsPath),
      podfilePath: resolveOptionalPathFromProjectRoot(projectRoot, config.project?.podfilePath),
    },
  }
}

export function normalizeVoltraConfig(loadedConfig: LoadedVoltraConfig): NormalizedVoltraConfig {
  assertObject(loadedConfig.config, 'config')
  assertOptionalString(loadedConfig.config.projectRoot, 'projectRoot')

  const projectRoot = resolvePathFromProjectRoot(loadedConfig.configDir, loadedConfig.config.projectRoot ?? loadedConfig.configDir)

  return {
    configPath: loadedConfig.configPath,
    configDir: loadedConfig.configDir,
    projectRoot,
    android: normalizeAndroidConfig(projectRoot, loadedConfig.config.android),
    ios: normalizeIOSConfig(projectRoot, loadedConfig.config.ios),
  }
}
