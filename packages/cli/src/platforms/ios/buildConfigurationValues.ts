import { getValuesByBuildConfiguration, isPerConfigurationMap } from '../../config/perConfiguration'
import { VoltraCliError } from '../../reporting/summary'

import type { PerConfiguration } from '../../config/perConfiguration'
import type { NormalizedVoltraIOSConfig, ResolvedVoltraIOSConfig } from '../../config/types'
import type { IOSProjectDiscovery } from '../../discovery/ios'

/**
 * Prefix of the user-defined build settings Voltra writes. Settings under it are Voltra's to add
 * and remove, so a value that stops being per build configuration leaves nothing behind.
 */
export const VOLTRA_BUILD_SETTING_PREFIX = 'VOLTRA_'

const APP_GROUP_IDENTIFIER_SETTING = `${VOLTRA_BUILD_SETTING_PREFIX}APP_GROUP_IDENTIFIER`
const KEYCHAIN_GROUP_SETTING = `${VOLTRA_BUILD_SETTING_PREFIX}KEYCHAIN_GROUP`

/**
 * The settings Voltra writes and is therefore allowed to remove. Anything else a project happens to
 * name `VOLTRA_*` belongs to the user and is left alone.
 */
export const VOLTRA_OWNED_BUILD_SETTINGS: readonly string[] = [APP_GROUP_IDENTIFIER_SETTING, KEYCHAIN_GROUP_SETTING]

export interface IOSBuildConfigurationValues {
  /** iOS config with every per-build-configuration value collapsed to a single string. */
  ios: ResolvedVoltraIOSConfig
  /** User-defined build settings to write, keyed by build configuration name. */
  buildSettings: Map<string, Record<string, string>>
}

export class IOSBuildConfigurationValueError extends VoltraCliError {
  constructor(message: string) {
    super(message, 'VOLTRA_IOS_BUILD_CONFIGURATION_VALUE_FAILED')
    this.name = 'IOSBuildConfigurationValueError'
  }
}

/**
 * Collapses per-build-configuration values into the single strings the platform mutators consume.
 *
 * A plain string resolves to itself and writes no build settings. A value given per build
 * configuration becomes a user-defined build setting holding one value per configuration, and
 * resolves to a reference to that setting, which Xcode expands per build into the entitlements and
 * Info.plist files. The app and the generated widget extension both read the value that way, so
 * nothing downstream has to know which environment is being built.
 */
export function resolveIOSBuildConfigurationValues(
  ios: NormalizedVoltraIOSConfig,
  discovery: IOSProjectDiscovery
): IOSBuildConfigurationValues {
  const buildSettings = new Map<string, Record<string, string>>()

  const resolve = (
    settingName: string,
    value: PerConfiguration<string> | undefined,
    context: string
  ): string | undefined => {
    if (!isPerConfigurationMap(value)) {
      return value
    }

    const valuesByBuildConfiguration = getValuesByBuildConfiguration(
      value,
      discovery.buildConfigurationNames,
      context,
      (message) => new IOSBuildConfigurationValueError(message)
    )

    for (const [buildConfigurationName, configurationValue] of valuesByBuildConfiguration) {
      const configurationSettings = buildSettings.get(buildConfigurationName) ?? {}
      configurationSettings[settingName] = configurationValue
      buildSettings.set(buildConfigurationName, configurationSettings)
    }

    return `$(${settingName})`
  }

  return {
    ios: {
      ...ios,
      groupIdentifier: resolve(APP_GROUP_IDENTIFIER_SETTING, ios.groupIdentifier, 'ios.groupIdentifier'),
      keychainGroup: resolve(KEYCHAIN_GROUP_SETTING, ios.keychainGroup, 'ios.keychainGroup'),
      project: {
        ...ios.project,
        entitlementsPath: resolveEntitlementsPath(ios.project.entitlementsPath, discovery),
      },
    },
    buildSettings,
  }
}

/**
 * The entitlements file of the default build configuration. Unlike a value written into a file, a
 * per-configuration entitlements path is a build setting of its own, so it is applied to the Xcode
 * project directly rather than through a reference.
 */
function resolveEntitlementsPath(
  entitlementsPath: PerConfiguration<string> | undefined,
  discovery: IOSProjectDiscovery
): string | undefined {
  if (!isPerConfigurationMap(entitlementsPath)) {
    return entitlementsPath
  }

  return discovery.entitlementsPathByConfiguration?.get(discovery.buildConfigurationNames[0])
}
