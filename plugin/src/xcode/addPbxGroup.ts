import { XcodeProject } from '@expo/config-plugins'

import { WidgetFiles } from '../lib/getWidgetFiles'

export function addPbxGroup(
  xcodeProject: XcodeProject,
  {
    targetName,
    widgetFiles,
  }: {
    targetName: string
    widgetFiles: WidgetFiles
  }
) {
  const { swiftFiles, intentFiles, otherFiles, assetDirectories, entitlementFiles, plistFiles } = widgetFiles

  // Add PBX group
  const { uuid: pbxGroupUuid } = xcodeProject.addPbxGroup(
    [
      ...swiftFiles,
      ...intentFiles,
      ...otherFiles,
      ...entitlementFiles,
      ...plistFiles,
      ...assetDirectories,
      `${targetName}.entitlements`,
    ],
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
