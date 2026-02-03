import { ConfigPlugin, withXcodeProject } from '@expo/config-plugins'
import * as path from 'path'

import { getWidgetFiles } from '../../utils'
import { configureBuild } from './build'
import { addXCConfigurationList } from './build/configurationList'
import { addPbxGroup } from './groups'
import { addProductFile } from './productFile'
import { configureTarget } from './target'
import { getMainAppTargetSettings } from './utils/getMainAppTargetSettings'

export interface ConfigureXcodeProjectProps {
  targetName: string
  bundleIdentifier: string
  deploymentTarget: string
}

/**
 * Plugin step that configures the Xcode project for the widget extension target.
 *
 * This:
 * - Adds XCConfigurationList with Debug/Release configurations
 * - Adds the product file (.appex)
 * - Configures the native target
 * - Adds build phases (Sources, CopyFiles, Frameworks, Resources)
 * - Adds PBXGroup for widget files
 *
 * This should run after generateTargetFiles so the files exist.
 */
export const configureTargetXcodeProject: ConfigPlugin<ConfigureXcodeProjectProps> = (config, props) => {
  const { targetName, bundleIdentifier, deploymentTarget } = props

  return withXcodeProject(config, (config) => {
    const xcodeProject = config.modResults
    const groupName = 'Embed Foundation Extensions'

    // Check if target already exists
    const nativeTargets = xcodeProject.pbxNativeTargetSection()
    const existingTarget = Object.values(nativeTargets).find((target: any) => target.name === targetName)

    if (existingTarget) {
      return config
    }

    const { platformProjectRoot } = config.modRequest
    const targetPath = path.join(platformProjectRoot, targetName)
    const widgetFiles = getWidgetFiles(targetPath, targetName)

    const targetUuid = xcodeProject.generateUuid()
    const currentProjectVersion = config.ios?.buildNumber || '1'
    const marketingVersion = config.version

    // Read main app target settings to synchronize code signing (but not deployment target)
    const mainAppSettings = getMainAppTargetSettings(xcodeProject)

    // Use the deploymentTarget from plugin config (or default), ignore main app's deployment target
    // This allows the widget extension to have its own deployment target independent of the main app

    // Add configuration list
    const xCConfigurationList = addXCConfigurationList(xcodeProject, {
      targetName,
      currentProjectVersion,
      bundleIdentifier,
      deploymentTarget,
      marketingVersion,
      codeSignStyle: mainAppSettings?.codeSignStyle,
      developmentTeam: mainAppSettings?.developmentTeam,
      provisioningProfileSpecifier: mainAppSettings?.provisioningProfileSpecifier,
    })

    // Add product file
    const productFile = addProductFile(xcodeProject, {
      targetName,
      groupName,
    })

    // Configure target (native target, project section, dependency)
    configureTarget(xcodeProject, {
      targetName,
      targetUuid,
      productFile,
      xCConfigurationList,
    })

    // Configure build phases
    configureBuild(xcodeProject, {
      targetName,
      targetUuid,
      bundleIdentifier,
      deploymentTarget,
      currentProjectVersion,
      marketingVersion,
      groupName,
      productFile,
      widgetFiles,
      codeSignStyle: mainAppSettings?.codeSignStyle,
      developmentTeam: mainAppSettings?.developmentTeam,
      provisioningProfileSpecifier: mainAppSettings?.provisioningProfileSpecifier,
    })

    // Add PBX group
    addPbxGroup(xcodeProject, {
      targetName,
      widgetFiles,
    })

    return config
  })
}
