import { XcodeProject } from '@expo/config-plugins'

export interface AddProductFileOptions {
  targetName: string
  groupName: string
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
