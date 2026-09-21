import { XcodeProject } from '@expo/config-plugins'

const pbxFile = require('xcode/lib/pbxFile')

/** Strips surrounding quotes from a pbx path/name value. */
export function normalizePath(value: string | undefined): string {
  if (!value) {
    return ''
  }
  return value.replace(/^"|"$/g, '')
}

/** Strips a trailing `/* comment *\/` and whitespace, yielding the bare UUID of a pbx reference. */
export function normalizeRef(value: unknown): string {
  return String(value)
    .replace(/\/\*.*?\*\//g, '')
    .trim()
}

/**
 * Resolves the PBXFileReference UUID for a widget file, scoped to the widget's own PBXGroup.
 *
 * pbxproj paths are group-relative, so a bare path like `Assets.xcassets` collides with any other
 * extension's identically named file. Scoping the lookup to the children of the widget group
 * (identified by `targetName`) keeps the widget's references distinct from those, which is what
 * prevents the shared-fileRef corruption behind issues #87/#32. When the widget group does not
 * exist yet, a fresh reference is created.
 */
export function ensureWidgetFileReference(xcodeProject: XcodeProject, filePath: string, targetName: string): string {
  const file = new pbxFile(filePath)
  const fileReferenceSection = xcodeProject.pbxFileReferenceSection()
  const group = xcodeProject.pbxGroupByName(targetName)

  if (group?.children) {
    for (const child of group.children) {
      const refKey = normalizeRef(child.value)
      const entry = fileReferenceSection[refKey]
      if (!entry) {
        continue
      }
      const entryPath = normalizePath(entry.path)
      if (entryPath === file.path || entryPath === normalizePath(filePath)) {
        return refKey
      }
    }
  }

  file.fileRef = xcodeProject.generateUuid()
  xcodeProject.addToPbxFileReferenceSection(file)
  return file.fileRef
}
