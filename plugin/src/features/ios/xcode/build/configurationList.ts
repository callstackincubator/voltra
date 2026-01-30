import { XcodeProject } from '@expo/config-plugins'

import { IOS } from '../../../../constants'

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

/**
 * Adds the XCConfigurationList for the widget extension target.
 */
export function addXCConfigurationList(xcodeProject: XcodeProject, options: AddConfigurationListOptions) {
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

  const commonBuildSettings: any = {
    PRODUCT_NAME: `"$(TARGET_NAME)"`,
    SWIFT_VERSION: IOS.SWIFT_VERSION,
    TARGETED_DEVICE_FAMILY: `"${IOS.DEVICE_FAMILY}"`,
    INFOPLIST_FILE: `${targetName}/Info.plist`,
    CURRENT_PROJECT_VERSION: `"${currentProjectVersion}"`,
    IPHONEOS_DEPLOYMENT_TARGET: `"${deploymentTarget}"`,
    PRODUCT_BUNDLE_IDENTIFIER: `"${bundleIdentifier}"`,
    GENERATE_INFOPLIST_FILE: `"YES"`,
    INFOPLIST_KEY_CFBundleDisplayName: targetName,
    INFOPLIST_KEY_NSHumanReadableCopyright: `""`,
    MARKETING_VERSION: `"${marketingVersion}"`,
    SWIFT_OPTIMIZATION_LEVEL: `"-Onone"`,
    CODE_SIGN_ENTITLEMENTS: `"${targetName}/${targetName}.entitlements"`,
    APPLICATION_EXTENSION_API_ONLY: '"YES"',
    ASSETCATALOG_COMPILER_APPICON_NAME: '""',
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
