import { XcodeProject } from '@expo/config-plugins'

/**
 * Adds a target dependency so the main app depends on the widget extension.
 */
export function addTargetDependency(xcodeProject: XcodeProject, target: { uuid: string }): void {
  if (!xcodeProject.hash.project.objects['PBXTargetDependency']) {
    xcodeProject.hash.project.objects['PBXTargetDependency'] = {}
  }
  if (!xcodeProject.hash.project.objects['PBXContainerItemProxy']) {
    xcodeProject.hash.project.objects['PBXContainerItemProxy'] = {}
  }

  xcodeProject.addTargetDependency(xcodeProject.getFirstTarget().uuid, [target.uuid])
}
