import { XcodeProject } from '@expo/config-plugins'

import { IOS } from '../../constants'

// ============================================================================
// Types
// ============================================================================

export interface CreateTargetSkeletonOptions {
  targetName: string
  targetUuid: string
}

// ============================================================================
// Main Function
// ============================================================================

/**
 * Creates the minimal widget-extension native target and registers it with the project.
 *
 * A target cannot be "ensured" into existence, so this is the one create-only step in
 * {@link applyXcodeChanges}: it adds an empty `PBXNativeTarget` (no product reference, configuration
 * list or build phases yet) to the `PBXNativeTarget` and `PBXProject` sections. The shared ensure
 * pipeline then fills in the configuration list, product file, group, build phases, attributes and
 * dependency — the same code that reconciles an already-existing target.
 *
 * @returns The freshly created native-target object (the value stored in the `PBXNativeTarget`
 * section under `targetUuid`).
 */
export function createTargetSkeleton(xcodeProject: XcodeProject, options: CreateTargetSkeletonOptions) {
  const { targetName, targetUuid } = options

  const target = {
    uuid: targetUuid,
    pbxNativeTarget: {
      isa: 'PBXNativeTarget',
      name: targetName,
      productName: targetName,
      productType: `"com.apple.product-type.app-extension"`,
      buildConfigurationList: '',
      productReference: '',
      buildPhases: [],
      buildRules: [],
      dependencies: [],
    },
  }

  xcodeProject.addToPbxNativeTargetSection(target)
  xcodeProject.addToPbxProjectSection(target)

  return xcodeProject.pbxNativeTargetSection()[targetUuid]
}

/**
 * Ensures target attributes (LastSwiftMigration) exist for the target.
 */
export function ensureTargetAttributes(xcodeProject: XcodeProject, targetUuid: string): void {
  const projectSection = xcodeProject.pbxProjectSection()
  const firstProject = xcodeProject.getFirstProject()

  if (!projectSection[firstProject.uuid].attributes.TargetAttributes) {
    projectSection[firstProject.uuid].attributes.TargetAttributes = {}
  }

  if (!projectSection[firstProject.uuid].attributes.TargetAttributes[targetUuid]) {
    projectSection[firstProject.uuid].attributes.TargetAttributes[targetUuid] = {
      LastSwiftMigration: IOS.LAST_SWIFT_MIGRATION,
    }
  }
}

/**
 * Ensures a target dependency exists so the main app depends on the widget extension.
 */
export function ensureTargetDependency(xcodeProject: XcodeProject, targetUuid: string): void {
  if (!xcodeProject.hash.project.objects['PBXTargetDependency']) {
    xcodeProject.hash.project.objects['PBXTargetDependency'] = {}
  }
  if (!xcodeProject.hash.project.objects['PBXContainerItemProxy']) {
    xcodeProject.hash.project.objects['PBXContainerItemProxy'] = {}
  }

  const mainTargetUuid = xcodeProject.getFirstTarget().uuid
  const mainTarget = xcodeProject.pbxNativeTargetSection()[mainTargetUuid]
  const existingDeps = mainTarget?.dependencies ?? []
  const targetDependencySection = xcodeProject.hash.project.objects['PBXTargetDependency'] || {}

  const alreadyExists = existingDeps.some((dep: any) => {
    const dependency = targetDependencySection[dep.value]
    return dependency?.target === targetUuid
  })

  if (!alreadyExists) {
    xcodeProject.addTargetDependency(mainTargetUuid, [targetUuid])
  }
}
