import { XcodeProject } from '@expo/config-plugins'

import type { WidgetFiles } from '../../types'

// eslint-disable-next-line @typescript-eslint/no-var-requires
const pbxFile = require('xcode/lib/pbxFile')

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

/**
 * Ensures a PBXGroup exists for the widget extension files.
 */
export function ensurePbxGroup(xcodeProject: XcodeProject, options: AddPbxGroupOptions): void {
  const { targetName, widgetFiles } = options
  const { swiftFiles, intentFiles, assetDirectories, entitlementFiles, plistFiles } = widgetFiles
  const allFiles = [...swiftFiles, ...intentFiles, ...entitlementFiles, ...plistFiles, ...assetDirectories]

  const existingGroup = xcodeProject.pbxGroupByName(targetName)
  if (!existingGroup) {
    addPbxGroup(xcodeProject, options)
    return
  }

  if (!existingGroup.children) {
    existingGroup.children = []
  }

  for (const filePath of allFiles) {
    const file = new pbxFile(filePath)
    const fileRef = ensureFileReference(xcodeProject, filePath)
    const alreadyInGroup = existingGroup.children.some(
      (child: any) => child.value === fileRef || child.comment === file.basename
    )
    if (!alreadyInGroup) {
      existingGroup.children.push({ value: fileRef, comment: file.basename })
    }
  }
}

function ensureFileReference(xcodeProject: XcodeProject, filePath: string): string {
  const fileReferenceSection = xcodeProject.pbxFileReferenceSection()
  const file = new pbxFile(filePath)

  for (const key of Object.keys(fileReferenceSection)) {
    if (/_comment$/.test(key)) {
      continue
    }
    const entry = fileReferenceSection[key]
    const entryPath = typeof entry?.path === 'string' ? entry.path.replace(/^"|"$/g, '') : ''
    if (entryPath === file.path || entryPath === filePath) {
      return key
    }
  }

  file.fileRef = xcodeProject.generateUuid()
  xcodeProject.addToPbxFileReferenceSection(file)
  return file.fileRef
}
