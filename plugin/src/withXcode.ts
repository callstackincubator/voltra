import { ConfigPlugin, withXcodeProject } from '@expo/config-plugins'
import * as path from 'path'

import { getWidgetFiles } from './lib/getWidgetFiles'
import { addBuildPhases } from './xcode/addBuildPhases'
import { addPbxGroup } from './xcode/addPbxGroup'
import { addProductFile } from './xcode/addProductFile'
import { addTargetDependency } from './xcode/addTargetDependency'
import { addToPbxNativeTargetSection } from './xcode/addToPbxNativeTargetSection'
import { addToPbxProjectSection } from './xcode/addToPbxProjectSection'
import { addXCConfigurationList } from './xcode/addXCConfigurationList'

export const withXcode: ConfigPlugin<{
  targetName: string
  bundleIdentifier: string
  deploymentTarget: string
}> = (config, { targetName, bundleIdentifier, deploymentTarget }) => {
  return withXcodeProject(config, (config) => {
    const xcodeProject = config.modResults

    const nativeTargets = xcodeProject.pbxNativeTargetSection()
    const existingTarget = Object.values(nativeTargets).find((target: any) => target.name === targetName)

    const groupName = 'Embed Foundation Extensions'
    const { platformProjectRoot } = config.modRequest
    const marketingVersion = config.version

    const targetPath = path.join(platformProjectRoot, targetName)

    const widgetFiles = getWidgetFiles(targetPath)

    // If target already exists, skip Xcode project structure modifications
    if (existingTarget) {
      return config
    }

    const targetUuid = xcodeProject.generateUuid()

    const xCConfigurationList = addXCConfigurationList(xcodeProject, {
      targetName,
      currentProjectVersion: config.ios!.buildNumber || '1',
      bundleIdentifier,
      deploymentTarget,
      marketingVersion,
    })

    const productFile = addProductFile(xcodeProject, {
      targetName,
      groupName,
    })

    const target = addToPbxNativeTargetSection(xcodeProject, {
      targetName,
      targetUuid,
      productFile,
      xCConfigurationList,
    })

    addToPbxProjectSection(xcodeProject, target)

    addTargetDependency(xcodeProject, target)

    addBuildPhases(xcodeProject, {
      targetUuid,
      groupName,
      productFile,
      widgetFiles,
    })

    addPbxGroup(xcodeProject, {
      targetName,
      widgetFiles,
    })

    return config
  })
}
