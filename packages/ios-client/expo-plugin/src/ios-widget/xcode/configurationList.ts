import { XcodeProject } from '@expo/config-plugins'

import { IOS } from '../../constants'
import type { MainAppSigningSettings, MainAppTargetSettings } from './mainAppSettings'

export interface EnsureConfigurationListOptions {
  targetName: string
  bundleIdentifier: string
  deploymentTarget: string
  /**
   * App marketing version (CFBundleShortVersionString). App Store Connect expects the appex
   * version to match the app's, so this becomes the widget's MARKETING_VERSION.
   */
  version?: string
  /** App build number; becomes the widget's CURRENT_PROJECT_VERSION. */
  buildNumber?: string
  /** Main app signing settings, applied per configuration name (Debug→Debug, Release→Release). */
  mainAppSettings?: MainAppTargetSettings | null
}

/**
 * Resolves the main app signing settings for a widget configuration name: an exact name match
 * wins, otherwise the first available configuration's settings are used as fallback.
 */
function signingForConfiguration(
  mainAppSettings: MainAppTargetSettings | null | undefined,
  configurationName: string
): MainAppSigningSettings {
  if (!mainAppSettings) {
    return {}
  }
  return mainAppSettings.byConfigurationName[configurationName] ?? mainAppSettings.fallback
}

function createBuildSettings(options: EnsureConfigurationListOptions, configurationName: string) {
  const { targetName, bundleIdentifier, deploymentTarget, version, buildNumber, mainAppSettings } = options
  const { codeSignStyle, developmentTeam, provisioningProfileSpecifier } = signingForConfiguration(
    mainAppSettings,
    configurationName
  )

  const buildSettings: Record<string, string> = {
    PRODUCT_NAME: `"$(TARGET_NAME)"`,
    SWIFT_VERSION: IOS.SWIFT_VERSION,
    TARGETED_DEVICE_FAMILY: `"${IOS.DEVICE_FAMILY}"`,
    INFOPLIST_FILE: `${targetName}/Info.plist`,
    INFOPLIST_OUTPUT_FORMAT: `"xml"`,
    CURRENT_PROJECT_VERSION: `"${buildNumber ?? '1'}"`,
    MARKETING_VERSION: `"${version ?? '1.0'}"`,
    IPHONEOS_DEPLOYMENT_TARGET: `"${deploymentTarget}"`,
    PRODUCT_BUNDLE_IDENTIFIER: `"${bundleIdentifier}"`,
    SWIFT_OPTIMIZATION_LEVEL: `"-Onone"`,
    CODE_SIGN_ENTITLEMENTS: `"${targetName}/${targetName}.entitlements"`,
    APPLICATION_EXTENSION_API_ONLY: '"YES"',
    ASSETCATALOG_COMPILER_APPICON_NAME: '""',
  }

  // Synchronize code signing settings from the main app target's matching configuration
  if (codeSignStyle) {
    buildSettings.CODE_SIGN_STYLE = `"${codeSignStyle}"`
  }
  if (developmentTeam) {
    buildSettings.DEVELOPMENT_TEAM = `"${developmentTeam}"`
  }
  if (provisioningProfileSpecifier) {
    buildSettings.PROVISIONING_PROFILE_SPECIFIER = `"${provisioningProfileSpecifier}"`
  }

  return buildSettings
}

/**
 * Adds a fresh XCConfigurationList for the widget extension target. Internal create-only fallback
 * for {@link ensureXCConfigurationList}; not part of the public pipeline.
 */
function addXCConfigurationList(xcodeProject: XcodeProject, options: EnsureConfigurationListOptions) {
  const { targetName } = options

  const buildConfigurationsList = [
    {
      name: 'Debug',
      isa: 'XCBuildConfiguration',
      buildSettings: createBuildSettings(options, 'Debug'),
    },
    {
      name: 'Release',
      isa: 'XCBuildConfiguration',
      buildSettings: createBuildSettings(options, 'Release'),
    },
  ]

  const xCConfigurationList = xcodeProject.addXCConfigurationList(
    buildConfigurationsList,
    'Release',
    `Build configuration list for PBXNativeTarget "${targetName}"`
  )

  return xCConfigurationList
}

/**
 * Ensures an existing XCConfigurationList is updated, or adds a new one if missing. Each widget
 * configuration receives the build settings derived for its own name, so Debug and Release signing
 * stay in sync with the main app's respective configurations.
 */
export function ensureXCConfigurationList(
  xcodeProject: XcodeProject,
  options: EnsureConfigurationListOptions,
  existingConfigurationListId?: string | { value?: string }
) {
  const configurationListId =
    typeof existingConfigurationListId === 'string'
      ? existingConfigurationListId.split(' ')[0]
      : existingConfigurationListId?.value?.split(' ')[0]
  const configurationLists = xcodeProject.pbxXCConfigurationList()
  const configurationList = configurationListId ? configurationLists?.[configurationListId] : null

  if (!configurationList || !configurationList.buildConfigurations) {
    return addXCConfigurationList(xcodeProject, options)
  }

  const buildConfigurations = configurationList.buildConfigurations
  const buildConfigurationSection = xcodeProject.pbxXCBuildConfigurationSection()

  for (const configRef of buildConfigurations) {
    const configId = typeof configRef === 'string' ? configRef.split(' ')[0] : configRef.value?.split(' ')[0]
    if (!configId) {
      continue
    }
    const buildConfiguration = buildConfigurationSection[configId]
    if (!buildConfiguration) {
      continue
    }

    const configurationName =
      typeof buildConfiguration.name === 'string' ? buildConfiguration.name.replace(/^"|"$/g, '') : ''
    buildConfiguration.buildSettings = {
      ...(buildConfiguration.buildSettings ?? {}),
      ...createBuildSettings(options, configurationName),
    }
  }

  return { uuid: configurationListId }
}
