import { XcodeProject } from '@expo/config-plugins'

import type { WidgetFiles } from '../../../types'

export interface AddPbxGroupOptions {
  targetName: string
  widgetFiles: WidgetFiles
}

/**
 * Adds a PBXGroup for the widget extension files.
 */
export function addPbxGroup(xcodeProject: XcodeProject, options: AddPbxGroupOptions): void {
  const { targetName, widgetFiles } = options
  const { swiftFiles, intentFiles, assetDirectories, entitlementFiles, plistFiles } = widgetFiles

  // Add PBX group with all widget files
  const { uuid: pbxGroupUuid } = xcodeProject.addPbxGroup(
    [...swiftFiles, ...intentFiles, ...entitlementFiles, ...plistFiles, ...assetDirectories],
    targetName,
    targetName
  )

  // Add PBXGroup to top level group
  const groups = xcodeProject.hash.project.objects['PBXGroup']
  if (pbxGroupUuid) {
    Object.keys(groups).forEach(function (key) {
      if (groups[key].name === undefined && groups[key].path === undefined) {
        xcodeProject.addToPbxGroup(pbxGroupUuid, key)
      }
    })
  }
}
