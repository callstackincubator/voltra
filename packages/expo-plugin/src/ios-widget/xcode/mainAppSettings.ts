import { XcodeProject } from '@expo/config-plugins'

export interface MainAppTargetSettings {
  deploymentTarget: string
  codeSignStyle?: string
  developmentTeam?: string
  provisioningProfileSpecifier?: string
}

/**
 * Reads build settings from the main app target to synchronize code signing with the widget extension.
 *
 * @param xcodeProject The Xcode project instance
 * @returns The main app target's build settings, or null if not found
 */
export function getMainAppTargetSettings(xcodeProject: XcodeProject): MainAppTargetSettings | null {
  try {
    const mainAppTarget = xcodeProject.getFirstTarget()?.firstTarget

    if (!mainAppTarget) {
      return null
    }

    // Get the build configuration list for the main app target
    const buildConfigurationListId = mainAppTarget.buildConfigurationList
    if (!buildConfigurationListId) {
      return null
    }

    // Extract UUID from buildConfigurationListId (it might include a comment like "UUID /* comment */")
    const buildConfigurationListUuid = buildConfigurationListId.split(' ')[0]

    const buildConfigurationList =
      xcodeProject.hash.project.objects['XCConfigurationList']?.[buildConfigurationListUuid]
    if (!buildConfigurationList || !buildConfigurationList.buildConfigurations) {
      return null
    }

    // Get the first build configuration (usually Debug) to read settings
    const firstConfigRef = buildConfigurationList.buildConfigurations[0]
    if (!firstConfigRef) {
      return null
    }

    // Extract UUID from config reference (it might include a comment)
    const firstConfigUuid =
      typeof firstConfigRef === 'string' ? firstConfigRef.split(' ')[0] : firstConfigRef.value?.split(' ')[0]
    if (!firstConfigUuid) {
      return null
    }

    const buildConfiguration = xcodeProject.hash.project.objects['XCBuildConfiguration']?.[firstConfigUuid]
    if (!buildConfiguration || !buildConfiguration.buildSettings) {
      return null
    }

    const buildSettings = buildConfiguration.buildSettings

    // Extract deployment target (remove quotes if present)
    const deploymentTarget =
      buildSettings.IPHONEOS_DEPLOYMENT_TARGET?.replace(/^"|"$/g, '') ||
      buildSettings['IPHONEOS_DEPLOYMENT_TARGET']?.replace(/^"|"$/g, '') ||
      null

    // Extract code signing settings
    const codeSignStyle =
      buildSettings.CODE_SIGN_STYLE?.replace(/^"|"$/g, '') ||
      buildSettings['CODE_SIGN_STYLE']?.replace(/^"|"$/g, '') ||
      null

    const developmentTeam =
      buildSettings.DEVELOPMENT_TEAM?.replace(/^"|"$/g, '') ||
      buildSettings['DEVELOPMENT_TEAM']?.replace(/^"|"$/g, '') ||
      null

    const provisioningProfileSpecifier =
      buildSettings.PROVISIONING_PROFILE_SPECIFIER?.replace(/^"|"$/g, '') ||
      buildSettings['PROVISIONING_PROFILE_SPECIFIER']?.replace(/^"|"$/g, '') ||
      null

    if (!deploymentTarget) {
      return null
    }

    return {
      deploymentTarget,
      codeSignStyle: codeSignStyle || undefined,
      developmentTeam: developmentTeam || undefined,
      provisioningProfileSpecifier: provisioningProfileSpecifier || undefined,
    }
  } catch {
    // If we can't read the settings, return null and use fallback values
    return null
  }
}
