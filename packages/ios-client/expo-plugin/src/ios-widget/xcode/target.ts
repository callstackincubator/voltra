import { XcodeProject } from '@expo/config-plugins'

import { IOS } from '../../constants'

// ============================================================================
// Types
// ============================================================================

export interface ConfigureTargetOptions {
  targetName: string
  targetUuid: string
  productFile: { fileRef: string }
  xCConfigurationList: { uuid: string }
}

interface AddNativeTargetOptions {
  targetName: string
  targetUuid: string
  productFile: { fileRef: string }
  xCConfigurationList: { uuid: string }
}

// ============================================================================
// Main Function
// ============================================================================

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

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Adds the widget extension target to the PBXNativeTarget section.
 */
function addToPbxNativeTargetSection(xcodeProject: XcodeProject, options: AddNativeTargetOptions) {
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

/**
 * Adds the target to the PBXProject section.
 */
function addToPbxProjectSection(xcodeProject: XcodeProject, target: { uuid: string }): void {
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

/**
 * Adds a target dependency so the main app depends on the widget extension.
 */
function addTargetDependency(xcodeProject: XcodeProject, target: { uuid: string }): void {
  if (!xcodeProject.hash.project.objects['PBXTargetDependency']) {
    xcodeProject.hash.project.objects['PBXTargetDependency'] = {}
  }
  if (!xcodeProject.hash.project.objects['PBXContainerItemProxy']) {
    xcodeProject.hash.project.objects['PBXContainerItemProxy'] = {}
  }

  xcodeProject.addTargetDependency(xcodeProject.getFirstTarget().uuid, [target.uuid])
}
