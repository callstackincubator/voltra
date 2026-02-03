import { XcodeProject } from '@expo/config-plugins'

export interface AddNativeTargetOptions {
  targetName: string
  targetUuid: string
  productFile: { fileRef: string }
  xCConfigurationList: { uuid: string }
}

/**
 * Adds the widget extension target to the PBXNativeTarget section.
 */
export function addToPbxNativeTargetSection(xcodeProject: XcodeProject, options: AddNativeTargetOptions) {
  const { targetName, targetUuid, productFile, xCConfigurationList } = options

  const target = {
    uuid: targetUuid,
    pbxNativeTarget: {
      isa: 'PBXNativeTarget',
      name: targetName,
      productName: targetName,
      productReference: productFile.fileRef,
      productType: `"com.apple.product-type.app-extension"`,
      buildConfigurationList: xCConfigurationList.uuid,
      buildPhases: [],
      buildRules: [],
      dependencies: [],
    },
  }

  xcodeProject.addToPbxNativeTargetSection(target)

  return target
}
