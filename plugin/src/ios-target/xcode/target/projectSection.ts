import { XcodeProject } from '@expo/config-plugins'

import { IOS } from '../../../../constants'

/**
 * Adds the target to the PBXProject section.
 */
export function addToPbxProjectSection(xcodeProject: XcodeProject, target: { uuid: string }): void {
  xcodeProject.addToPbxProjectSection(target)

  // Add target attributes to project section
  const projectSection = xcodeProject.pbxProjectSection()
  const firstProject = xcodeProject.getFirstProject()

  if (!projectSection[firstProject.uuid].attributes.TargetAttributes) {
    projectSection[firstProject.uuid].attributes.TargetAttributes = {}
  }

  projectSection[firstProject.uuid].attributes.TargetAttributes[target.uuid] = {
    LastSwiftMigration: IOS.LAST_SWIFT_MIGRATION,
  }
}
