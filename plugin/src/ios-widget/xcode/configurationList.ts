import { XcodeProject } from '@expo/config-plugins'

import { IOS } from '../../constants'

export interface AddConfigurationListOptions {
  targetName: string
  currentProjectVersion: string
  bundleIdentifier: string
  deploymentTarget: string
  marketingVersion?: string
  codeSignStyle?: string
  developmentTeam?: string
  provisioningProfileSpecifier?: string
}

function createCommonBuildSettings(options: AddConfigurationListOptions) {
  const {
    targetName,
    currentProjectVersion,
    bundleIdentifier,
    deploymentTarget,
    marketingVersion,
    codeSignStyle,
    developmentTeam,
    provisioningProfileSpecifier,
  } = options

  const commonBuildSettings: Record<string, string> = {
    PRODUCT_NAME: `"$(TARGET_NAME)"`,
    SWIFT_VERSION: IOS.SWIFT_VERSION,
    TARGETED_DEVICE_FAMILY: `"${IOS.DEVICE_FAMILY}"`,
    INFOPLIST_FILE: `${targetName}/Info.plist`,
    INFOPLIST_OUTPUT_FORMAT: `"xml"`,
    CURRENT_PROJECT_VERSION: `"${currentProjectVersion}"`,
    IPHONEOS_DEPLOYMENT_TARGET: `"${deploymentTarget}"`,
    PRODUCT_BUNDLE_IDENTIFIER: `"${bundleIdentifier}"`,
    GENERATE_INFOPLIST_FILE: `"YES"`,
    INFOPLIST_KEY_CFBundleDisplayName: targetName,
    INFOPLIST_KEY_NSHumanReadableCopyright: `""`,
    SWIFT_OPTIMIZATION_LEVEL: `"-Onone"`,
    CODE_SIGN_ENTITLEMENTS: `"${targetName}/${targetName}.entitlements"`,
    APPLICATION_EXTENSION_API_ONLY: '"YES"',
    ASSETCATALOG_COMPILER_APPICON_NAME: '""',
  }

  if (marketingVersion) {
    commonBuildSettings.MARKETING_VERSION = `"${marketingVersion}"`
  }

  // Synchronize code signing settings from main app target
  if (codeSignStyle) {
    commonBuildSettings.CODE_SIGN_STYLE = `"${codeSignStyle}"`
  }
  if (developmentTeam) {
    commonBuildSettings.DEVELOPMENT_TEAM = `"${developmentTeam}"`
  }
  if (provisioningProfileSpecifier) {
    commonBuildSettings.PROVISIONING_PROFILE_SPECIFIER = `"${provisioningProfileSpecifier}"`
  }

  return commonBuildSettings
}

/**
 * Adds the XCConfigurationList for the widget extension target.
 */
export function addXCConfigurationList(xcodeProject: XcodeProject, options: AddConfigurationListOptions) {
  const { targetName } = options
  const commonBuildSettings = createCommonBuildSettings(options)

  const buildConfigurationsList = [
    {
      name: 'Debug',
      isa: 'XCBuildConfiguration',
      buildSettings: {
        ...commonBuildSettings,
      },
    },
    {
      name: 'Release',
      isa: 'XCBuildConfiguration',
      buildSettings: {
        ...commonBuildSettings,
      },
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
 * Ensures an existing XCConfigurationList is updated, or adds a new one if missing.
 */
export function ensureXCConfigurationList(
  xcodeProject: XcodeProject,
  options: AddConfigurationListOptions,
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

  const commonBuildSettings = createCommonBuildSettings(options)
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

    buildConfiguration.buildSettings = {
      ...(buildConfiguration.buildSettings ?? {}),
      ...commonBuildSettings,
    }
  }

  return { uuid: configurationListId }
}
