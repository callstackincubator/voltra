import { XcodeProject } from '@expo/config-plugins'
import * as util from 'util'

import type { WidgetFiles } from '../../../../types'

export interface AddBuildPhasesOptions {
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

/**
 * Adds all required build phases for the widget extension target.
 */
export function addBuildPhases(xcodeProject: XcodeProject, options: AddBuildPhasesOptions): void {
  const { targetUuid, groupName, productFile, widgetFiles } = options
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
    comment: util.format('%s in %s', productFile.basename, productFile.group),
  })
  xcodeProject.addToPbxBuildFileSection(productFile)

  // Frameworks build phase
  xcodeProject.addBuildPhase([], 'PBXFrameworksBuildPhase', groupName, targetUuid, folderType, buildPath)

  // Resources build phase
  xcodeProject.addBuildPhase([...assetDirectories], 'PBXResourcesBuildPhase', 'Resources', targetUuid)
}
