import { XcodeProject } from '@expo/config-plugins'

import { addTargetDependency } from './dependency'
import { addToPbxNativeTargetSection } from './nativeTarget'
import { addToPbxProjectSection } from './projectSection'

export interface ConfigureTargetOptions {
  targetName: string
  targetUuid: string
  productFile: { fileRef: string }
  xCConfigurationList: { uuid: string }
}

/**
 * Configures the widget extension target in the Xcode project.
 *
 * This:
 * - Adds the target to PBXNativeTarget section
 * - Adds the target to PBXProject section
 * - Adds a dependency from the main app to the widget extension
 */
export function configureTarget(xcodeProject: XcodeProject, options: ConfigureTargetOptions) {
  const target = addToPbxNativeTargetSection(xcodeProject, options)
  addToPbxProjectSection(xcodeProject, target)
  addTargetDependency(xcodeProject, target)

  return target
}
