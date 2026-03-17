import { XcodeProject } from '@expo/config-plugins'

export interface AddProductFileOptions {
  targetName: string
  groupName: string
}

function findProductFileReference(xcodeProject: XcodeProject, targetName: string): { fileRef: string } | null {
  const fileReferenceSection = xcodeProject.pbxFileReferenceSection()
  const targetProductName = `${targetName}.appex`

  for (const key of Object.keys(fileReferenceSection)) {
    if (/_comment$/.test(key)) {
      continue
    }
    const entry = fileReferenceSection[key]
    const path = typeof entry?.path === 'string' ? entry.path.replace(/^"|"$/g, '') : ''
    const name = typeof entry?.name === 'string' ? entry.name.replace(/^"|"$/g, '') : ''

    if (path === targetProductName || name === targetProductName) {
      return { fileRef: key }
    }
  }

  return null
}

function findBuildFileForFileRef(xcodeProject: XcodeProject, fileRef: string): { uuid: string } | null {
  const buildFileSection = xcodeProject.pbxBuildFileSection()

  for (const key of Object.keys(buildFileSection)) {
    if (/_comment$/.test(key)) {
      continue
    }
    const entry = buildFileSection[key]
    if (entry?.fileRef === fileRef) {
      return { uuid: key }
    }
  }

  return null
}

/**
 * Adds the product file (.appex) for the widget extension.
 */
export function addProductFile(xcodeProject: XcodeProject, options: AddProductFileOptions) {
  const { targetName, groupName } = options

  const productFileOptions = {
    basename: `${targetName}.appex`,
    group: groupName,
    explicitFileType: 'wrapper.app-extension',
    settings: {
      ATTRIBUTES: ['RemoveHeadersOnCopy'],
    },
    includeInIndex: 0,
    path: `${targetName}.appex`,
    sourceTree: 'BUILT_PRODUCTS_DIR',
  }

  const productFile = xcodeProject.addProductFile(targetName, productFileOptions)

  return productFile
}

/**
 * Ensures the product file (.appex) exists and returns it.
 */
export function ensureProductFile(xcodeProject: XcodeProject, options: AddProductFileOptions) {
  const { targetName, groupName } = options
  const existingFile = findProductFileReference(xcodeProject, targetName)

  if (!existingFile) {
    return addProductFile(xcodeProject, options)
  }

  const buildFile = findBuildFileForFileRef(xcodeProject, existingFile.fileRef)
  const productFile = {
    uuid: buildFile?.uuid ?? xcodeProject.generateUuid(),
    fileRef: existingFile.fileRef,
    basename: `${targetName}.appex`,
    group: groupName,
  }

  if (!buildFile) {
    xcodeProject.addToPbxBuildFileSection(productFile as any)
  }

  return productFile
}
