import { XcodeProject } from '@expo/config-plugins'

import type { IOSWidgetExtensionFiles } from '../../types'
import { ensureWidgetFileReference } from './fileReferences'

const pbxFile = require('xcode/lib/pbxFile')

export interface AddPbxGroupOptions {
  targetName: string
  widgetFiles: IOSWidgetExtensionFiles
}

function collectGroupFiles(widgetFiles: IOSWidgetExtensionFiles): string[] {
  const { swiftFiles, intentFiles, assetDirectories, entitlementFiles, plistFiles, localizedStringResources } =
    widgetFiles
  return [
    ...swiftFiles,
    ...intentFiles,
    ...entitlementFiles,
    ...plistFiles,
    ...assetDirectories,
    ...localizedStringResources,
  ]
}

/**
 * Adds a PBXGroup for the widget extension files.
 *
 * Constructs the PBXGroup and its PBXFileReference children by hand rather than delegating to
 * `xcodeProject.addPbxGroup`, because that helper also creates a PBXBuildFile per file as a side
 * effect. Those extra build files collide with the ones managed by the build-phase functions and
 * produce the "no parent for object" consistency errors from issues #87/#32. File references are
 * resolved through the widget-scoped {@link ensureWidgetFileReference} so they are shared with the
 * build phases instead of duplicated.
 */
export function addPbxGroup(xcodeProject: XcodeProject, options: AddPbxGroupOptions): void {
  const { targetName, widgetFiles } = options
  const allFiles = collectGroupFiles(widgetFiles)

  const pbxGroupUuid = xcodeProject.generateUuid()
  const pbxGroup = {
    isa: 'PBXGroup',
    children: [] as { value: string; comment: string }[],
    name: targetName,
    path: targetName,
    sourceTree: '"<group>"',
  }

  const groups = xcodeProject.hash.project.objects['PBXGroup']
  groups[pbxGroupUuid] = pbxGroup
  groups[`${pbxGroupUuid}_comment`] = targetName

  for (const filePath of allFiles) {
    const file = new pbxFile(filePath)
    const fileRef = ensureWidgetFileReference(xcodeProject, filePath, targetName)
    pbxGroup.children.push({ value: fileRef, comment: file.basename })
  }

  // Attach the new group to the top-level (unnamed, path-less) group.
  Object.keys(groups).forEach(function (key) {
    if (/_comment$/.test(key)) {
      return
    }
    if (groups[key].name === undefined && groups[key].path === undefined) {
      xcodeProject.addToPbxGroup(pbxGroupUuid, key)
    }
  })
}

/**
 * Ensures a PBXGroup exists for the widget extension files.
 */
export function ensurePbxGroup(xcodeProject: XcodeProject, options: AddPbxGroupOptions): void {
  const { targetName, widgetFiles } = options
  const allFiles = collectGroupFiles(widgetFiles)

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
    const fileRef = ensureWidgetFileReference(xcodeProject, filePath, targetName)
    const alreadyInGroup = existingGroup.children.some(
      (child: any) => child.value === fileRef || child.comment === file.basename
    )
    if (!alreadyInGroup) {
      existingGroup.children.push({ value: fileRef, comment: file.basename })
    }
  }
}
