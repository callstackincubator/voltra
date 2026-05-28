import fs from 'node:fs/promises'

import { PBXNativeTarget, XcodeProject } from '@bacons/xcode'

import { VoltraCliError } from '../../reporting/summary'

import type { PBXCopyFilesBuildPhase, PBXFrameworksBuildPhase, PBXGroup, PBXResourcesBuildPhase, PBXSourcesBuildPhase, XCBuildConfiguration } from '@bacons/xcode'
import type { IOSProjectDiscovery } from '../../discovery/ios'

const IOS_APP_PRODUCT_TYPE = 'com.apple.product-type.application'
const { build: buildXcodeProjectJson } = require('@bacons/xcode/json') as {
  build(project: ReturnType<XcodeProject['toJSON']>): string
}

export interface IOSXcodeTargetBuildConfigurations {
  all: XCBuildConfiguration[]
  default: XCBuildConfiguration
}

export interface IOSXcodeTargetBuildPhases {
  sources: PBXSourcesBuildPhase
  resources: PBXResourcesBuildPhase
  frameworks: PBXFrameworksBuildPhase
}

export interface IOSXcodeTargetContext {
  target: PBXNativeTarget
  buildConfigurations: IOSXcodeTargetBuildConfigurations
  buildPhases: IOSXcodeTargetBuildPhases
  getCopyFilesBuildPhaseFor(target: PBXNativeTarget): PBXCopyFilesBuildPhase
}

export interface IOSXcodeProjectContext {
  project: XcodeProject
  mainAppTarget: IOSXcodeTargetContext
  mainGroup: PBXGroup
  productsGroup: PBXGroup
  frameworksGroup: PBXGroup
}

export class IOSXcodeProjectError extends VoltraCliError {
  constructor(message: string) {
    super(message, 'VOLTRA_IOS_XCODE_FAILED')
    this.name = 'IOSXcodeProjectError'
  }
}

export function openIOSXcodeProject(discovery: IOSProjectDiscovery): IOSXcodeProjectContext {
  try {
    const project = XcodeProject.open(discovery.pbxprojPath)
    const mainGroup = project.rootObject.props.mainGroup

    if (!mainGroup) {
      throw new IOSXcodeProjectError(`Xcode project is missing a main group: ${discovery.pbxprojPath}`)
    }

    const mainAppTarget = resolveMainAppTarget(project, discovery)

    return {
      project,
      mainAppTarget,
      mainGroup,
      productsGroup: getExistingProductGroup(project, discovery),
      frameworksGroup: getExistingFrameworksGroup(project, discovery),
    }
  } catch (error: unknown) {
    if (error instanceof IOSXcodeProjectError) {
      throw error
    }

    throw new IOSXcodeProjectError(`Failed to open Xcode project ${discovery.pbxprojPath}: ${getErrorMessage(error)}`)
  }
}

export function getApplicationTargets(project: XcodeProject): PBXNativeTarget[] {
  return project.rootObject.props.targets.filter((target): target is PBXNativeTarget => {
    return PBXNativeTarget.is(target) && target.props.productType === IOS_APP_PRODUCT_TYPE
  })
}

export function getTargetBuildConfigurations(target: PBXNativeTarget): IOSXcodeTargetBuildConfigurations {
  const configurationList = target.props.buildConfigurationList

  if (!configurationList) {
    throw new IOSXcodeProjectError(`Target '${target.props.name}' is missing a build configuration list.`)
  }

  const all = configurationList.props.buildConfigurations

  if (all.length === 0) {
    throw new IOSXcodeProjectError(`Target '${target.props.name}' does not define any build configurations.`)
  }

  return {
    all,
    default: configurationList.getDefaultConfiguration(),
  }
}

export function getTargetBuildPhases(target: PBXNativeTarget): IOSXcodeTargetBuildPhases {
  return {
    sources: target.getSourcesBuildPhase(),
    resources: target.getResourcesBuildPhase(),
    frameworks: target.getFrameworksBuildPhase(),
  }
}

export function ensureMainGroupChild(context: IOSXcodeProjectContext, name: string): PBXGroup {
  return context.project.rootObject.ensureMainGroupChild(name)
}

export function ensureProductsGroup(context: IOSXcodeProjectContext): PBXGroup {
  return context.project.rootObject.ensureProductGroup()
}

export function ensureFrameworksGroup(context: IOSXcodeProjectContext): PBXGroup {
  return context.project.rootObject.getFrameworksGroup()
}

export function saveIOSXcodeProject(context: IOSXcodeProjectContext): Promise<void> {
  const contents = buildXcodeProjectJson(context.project.toJSON())
  return fs.writeFile(context.project.filePath, contents, 'utf8')
}

function resolveMainAppTarget(project: XcodeProject, discovery: IOSProjectDiscovery): IOSXcodeTargetContext {
  const applicationTargets = getApplicationTargets(project)
  const target = applicationTargets.find((candidate) => candidate.props.name === discovery.mainTargetName)

  if (!target) {
    throw new IOSXcodeProjectError(
      `Xcode project does not contain the discovered main app target '${discovery.mainTargetName}'. Available application targets: ${applicationTargets
        .map((candidate) => candidate.props.name)
        .sort()
        .join(', ')}`
    )
  }

  return {
    target,
    buildConfigurations: getTargetBuildConfigurations(target),
    buildPhases: getTargetBuildPhases(target),
    getCopyFilesBuildPhaseFor(dependencyTarget: PBXNativeTarget): PBXCopyFilesBuildPhase {
      return target.getCopyBuildPhaseForTarget(dependencyTarget)
    },
  }
}

function getExistingProductGroup(project: XcodeProject, discovery: IOSProjectDiscovery): PBXGroup {
  const productGroup = project.rootObject.props.productRefGroup

  if (!productGroup) {
    throw new IOSXcodeProjectError(`Xcode project is missing the Products group: ${discovery.pbxprojPath}`)
  }

  return productGroup
}

function getExistingFrameworksGroup(project: XcodeProject, discovery: IOSProjectDiscovery): PBXGroup {
  const frameworksGroup = project.rootObject.props.mainGroup?.getChildGroups().find((group) => group.getDisplayName() === 'Frameworks')

  if (!frameworksGroup) {
    throw new IOSXcodeProjectError(`Xcode project is missing the Frameworks group: ${discovery.pbxprojPath}`)
  }

  return frameworksGroup
}

function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error)
}
