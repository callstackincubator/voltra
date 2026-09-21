import { XcodeProject } from '@expo/config-plugins'

/** Code-signing settings read from one of the main app target's build configurations. */
export interface MainAppSigningSettings {
  codeSignStyle?: string
  developmentTeam?: string
  provisioningProfileSpecifier?: string
}

export interface MainAppTargetSettings {
  /**
   * Signing settings keyed by build-configuration name (e.g. `Debug`, `Release`). Release
   * provisioning often differs from Debug, so the widget must mirror the main app per
   * configuration rather than copying one configuration's signing into both.
   */
  byConfigurationName: Record<string, MainAppSigningSettings>
  /** The first configuration's settings, used for widget configurations with no name match. */
  fallback: MainAppSigningSettings
}

/** Strips surrounding quotes from a raw build-setting value. */
function unquote(value: unknown): string | undefined {
  if (typeof value !== 'string') {
    return undefined
  }
  return value.replace(/^"|"$/g, '')
}

/** Reads the signing-related build settings from a single XCBuildConfiguration. */
function readSigningSettings(buildSettings: Record<string, unknown>): MainAppSigningSettings {
  return {
    codeSignStyle: unquote(buildSettings.CODE_SIGN_STYLE),
    developmentTeam: unquote(buildSettings.DEVELOPMENT_TEAM),
    provisioningProfileSpecifier: unquote(buildSettings.PROVISIONING_PROFILE_SPECIFIER),
  }
}

/**
 * Reads code-signing build settings from every build configuration of the main app target, so the
 * widget extension can synchronize signing per configuration (Debug→Debug, Release→Release).
 *
 * @param xcodeProject The Xcode project instance
 * @returns Signing settings keyed by configuration name plus a first-configuration fallback, or
 * null when the main app target or its configurations cannot be resolved
 */
export function getMainAppTargetSettings(xcodeProject: XcodeProject): MainAppTargetSettings | null {
  try {
    const mainAppTarget = xcodeProject.getFirstTarget()?.firstTarget
    if (!mainAppTarget) {
      return null
    }

    const buildConfigurationListId = mainAppTarget.buildConfigurationList
    if (!buildConfigurationListId) {
      return null
    }

    // Extract UUID from buildConfigurationListId (it might include a comment like "UUID /* comment */")
    const buildConfigurationListUuid = buildConfigurationListId.split(' ')[0]

    const buildConfigurationList =
      xcodeProject.hash.project.objects['XCConfigurationList']?.[buildConfigurationListUuid]
    if (!buildConfigurationList?.buildConfigurations) {
      return null
    }

    const buildConfigurationSection = xcodeProject.hash.project.objects['XCBuildConfiguration'] ?? {}
    const byConfigurationName: Record<string, MainAppSigningSettings> = {}
    let fallback: MainAppSigningSettings | null = null

    for (const configRef of buildConfigurationList.buildConfigurations) {
      // Extract UUID from the config reference (it might include a comment)
      const configUuid = typeof configRef === 'string' ? configRef.split(' ')[0] : configRef.value?.split(' ')[0]
      if (!configUuid) {
        continue
      }

      const buildConfiguration = buildConfigurationSection[configUuid]
      if (!buildConfiguration?.buildSettings) {
        continue
      }

      const settings = readSigningSettings(buildConfiguration.buildSettings)
      const configName = unquote(buildConfiguration.name)
      if (configName && !(configName in byConfigurationName)) {
        byConfigurationName[configName] = settings
      }
      fallback = fallback ?? settings
    }

    if (!fallback) {
      return null
    }

    return { byConfigurationName, fallback }
  } catch {
    // If we can't read the settings, return null and use fallback values
    return null
  }
}
