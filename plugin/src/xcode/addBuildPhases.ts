import { XcodeProject } from '@expo/config-plugins'
import * as util from 'util'

import { WidgetFiles } from '../lib/getWidgetFiles'

export function addBuildPhases(
  xcodeProject: XcodeProject,
  {
    targetUuid,
    groupName,
    productFile,
    widgetFiles,
  }: {
    targetUuid: string
    groupName: string
    productFile: {
      uuid: string
      target: string
      basename: string
      group: string
    }
    widgetFiles: WidgetFiles
  }
) {
  const buildPath = `""`
  const folderType = 'app_extension'

  const { swiftFiles, intentFiles, assetDirectories } = widgetFiles

  // Sources build phase
  xcodeProject.addBuildPhase(
    [...swiftFiles, ...intentFiles],
    'PBXSourcesBuildPhase',
    groupName,
    targetUuid,
    folderType,
    buildPath
  )

  // Copy files build phase
  xcodeProject.addBuildPhase(
    [],
    'PBXCopyFilesBuildPhase',
    groupName,
    xcodeProject.getFirstTarget().uuid,
    folderType,
    buildPath
  )

  xcodeProject.buildPhaseObject('PBXCopyFilesBuildPhase', groupName, productFile.target).files.push({
    value: productFile.uuid,
    comment: util.format('%s in %s', productFile.basename, productFile.group), // longComment(file);
  })
  xcodeProject.addToPbxBuildFileSection(productFile)

  // Frameworks build phase
  xcodeProject.addBuildPhase([], 'PBXFrameworksBuildPhase', groupName, targetUuid, folderType, buildPath)

  // Resources build phase
  xcodeProject.addBuildPhase(
    [...assetDirectories],
    'PBXResourcesBuildPhase',
    groupName,
    targetUuid,
    folderType,
    buildPath
  )
}
