import path from 'node:path'

import {
  PBXFileReference,
  PBXFrameworksBuildPhase,
  PBXGroup,
  PBXNativeTarget,
  PBXResourcesBuildPhase,
  PBXSourcesBuildPhase,
  XCBuildConfiguration,
  XCConfigurationList,
} from '@bacons/xcode'

import { normalizeRelativePath, toRelativePath } from '../../fs/path'
import { VoltraCliError } from '../../reporting/summary'
import { resolveIOSWidgetTargetName } from './targetName'
import { ensureMainGroupChild, openIOSXcodeProject, saveIOSXcodeProject } from './xcode'

import type { IOSProjectDiscovery } from '../../discovery/ios'
import type { NormalizedVoltraIOSConfig } from '../../config/types'
import type { ReportedChange } from '../../reporting/summary'
import type { IOSXcodeProjectContext } from './xcode'
import type { BuildSettings } from '@bacons/xcode/build/json/types'

const IOS_APP_EXTENSION_PRODUCT_TYPE = 'com.apple.product-type.app-extension'
const PRODUCT_FILE_TYPE = 'wrapper.app-extension'
const SWIFT_FILE_TYPE = 'sourcecode.swift'
const STRINGS_FILE_TYPE = 'text.plist.strings'
const PLIST_FILE_TYPE = 'text.plist.xml'
const ASSET_CATALOG_FILE_TYPE = 'folder.assetcatalog'
const COPY_FILES_PHASE_NAME = 'Embed Foundation Extensions'
const SOURCE_EXTENSIONS = new Set(['.swift'])
const RESOURCE_EXTENSIONS = new Set(['.xcassets', '.strings', '.ttf', '.otf', '.woff', '.woff2'])

export interface EnsureIOSWidgetTargetOptions {
  projectRoot: string
  ios: NormalizedVoltraIOSConfig
  discovery: IOSProjectDiscovery
  generatedFiles: string[]
  previousGeneratedFiles?: string[]
}

export interface EnsureIOSWidgetTargetResult {
  change?: ReportedChange
  targetName: string
}

export class IOSWidgetTargetMutationError extends VoltraCliError {
  constructor(message: string) {
    super(message, 'VOLTRA_IOS_XCODE_TARGET_FAILED')
    this.name = 'IOSWidgetTargetMutationError'
  }
}

export async function ensureIOSWidgetTarget(options: EnsureIOSWidgetTargetOptions): Promise<EnsureIOSWidgetTargetResult> {
  const { projectRoot, ios, discovery, generatedFiles, previousGeneratedFiles } = options
  const targetName = resolveIOSWidgetTargetName(ios, discovery)
  const context = openIOSXcodeProject(discovery)
  const beforeSerialized = JSON.stringify(context.project.toJSON())
  const productPath = `${targetName}.appex`
  const nextGeneratedFiles = normalizeGeneratedFilePaths(generatedFiles, projectRoot, discovery)
  const previousWidgetFiles = normalizeGeneratedFilePaths(previousGeneratedFiles ?? [], projectRoot, discovery)
  const staleTargetNames = getStaleWidgetTargetNames(previousWidgetFiles, targetName)
  const bundleIdentifier = resolveBundleIdentifier(context, discovery, targetName)
  const codeSigning = getMainAppCodeSigningSettings(context)
  const mainAppEntitlementsPath = getMainAppEntitlementsBuildSetting(projectRoot, discovery)

  removeStaleWidgetTargets(context, staleTargetNames)
  ensureMainAppEntitlementsBuildSetting(context, mainAppEntitlementsPath)
  ensureWidgetTarget(context, targetName, bundleIdentifier, ios.deploymentTarget, codeSigning)

  const widgetTarget = getWidgetTarget(context, targetName)
  const widgetGroup = ensureWidgetGroup(context, targetName)
  const productFile = ensureProductFile(context, targetName, productPath)

  sanitizeWidgetGroupChildren(widgetGroup)

  widgetTarget.props.productReference = productFile
  widgetTarget.props.productType = IOS_APP_EXTENSION_PRODUCT_TYPE
  widgetTarget.props.productName = targetName

  ensureTargetDependency(context, widgetTarget)
  ensureTargetAttributes(context, widgetTarget)
  removeStaleGeneratedFileReferences(context, widgetTarget, widgetGroup, previousWidgetFiles, nextGeneratedFiles)
  ensureBuildPhases(context, widgetTarget, productFile, nextGeneratedFiles)
  ensureWidgetGroupFiles(context, widgetGroup, targetName, nextGeneratedFiles)
  removeEmptyWidgetGroups(context, staleTargetNames)

  const changePath = toRelativePath(projectRoot, discovery.pbxprojPath)
  const afterSerialized = JSON.stringify(context.project.toJSON())

  if (beforeSerialized !== afterSerialized) {
    await saveIOSXcodeProject(context)
  }

  return {
    change: beforeSerialized === afterSerialized ? undefined : { kind: 'updated', path: changePath },
    targetName,
  }
}

function ensureWidgetTarget(
  context: IOSXcodeProjectContext,
  targetName: string,
  bundleIdentifier: string,
  deploymentTarget: string,
  codeSigning: MainAppCodeSigningSettings
): PBXNativeTarget {
  const existingTarget = getWidgetTargetOptional(context, targetName)

  if (existingTarget) {
    ensureBuildConfigurations(existingTarget, targetName, bundleIdentifier, deploymentTarget, codeSigning)
    return existingTarget
  }

  const buildConfigurationList = createBuildConfigurationList(context, targetName, bundleIdentifier, deploymentTarget, codeSigning)
  const target = context.project.rootObject.createNativeTarget({
    buildConfigurationList,
    name: targetName,
    productType: IOS_APP_EXTENSION_PRODUCT_TYPE,
  })

  target.props.productName = targetName
  target.getSourcesBuildPhase()
  target.getResourcesBuildPhase()
  target.getFrameworksBuildPhase()
  return target
}

function createBuildConfigurationList(
  context: IOSXcodeProjectContext,
  targetName: string,
  bundleIdentifier: string,
  deploymentTarget: string,
  codeSigning: MainAppCodeSigningSettings
): XCConfigurationList {
  const configs = context.mainAppTarget.buildConfigurations.all.map((config) => {
    return XCBuildConfiguration.create(context.project, {
      name: config.props.name,
      buildSettings: buildWidgetBuildSettings(targetName, bundleIdentifier, deploymentTarget, codeSigning, config.props.name),
    })
  })

  return XCConfigurationList.create(context.project, {
    buildConfigurations: configs,
    defaultConfigurationName: context.mainAppTarget.buildConfigurations.default.props.name,
  })
}

function ensureBuildConfigurations(
  target: PBXNativeTarget,
  targetName: string,
  bundleIdentifier: string,
  deploymentTarget: string,
  codeSigning: MainAppCodeSigningSettings
): void {
  const configurationList = target.props.buildConfigurationList

  if (!configurationList) {
    throw new IOSWidgetTargetMutationError(`Widget target '${target.props.name}' is missing a build configuration list.`)
  }

  for (const config of configurationList.props.buildConfigurations) {
    Object.assign(config.props.buildSettings, buildWidgetBuildSettings(targetName, bundleIdentifier, deploymentTarget, codeSigning, config.props.name))
  }
}

function buildWidgetBuildSettings(
  targetName: string,
  bundleIdentifier: string,
  deploymentTarget: string,
  codeSigning: MainAppCodeSigningSettings,
  configurationName: string
): BuildSettings & Record<string, string | undefined> {
  const buildSettings: BuildSettings & Record<string, string | undefined> = {
    ASSETCATALOG_COMPILER_APPICON_NAME: '',
    CODE_SIGN_ENTITLEMENTS: `${targetName}/${targetName}.entitlements`,
    CURRENT_PROJECT_VERSION: '1',
    INFOPLIST_FILE: `${targetName}/Info.plist`,
    INFOPLIST_OUTPUT_FORMAT: 'xml',
    IPHONEOS_DEPLOYMENT_TARGET: deploymentTarget,
    MARKETING_VERSION: '1.0',
    OTHER_SWIFT_FLAGS: `$(inherited) -D EXPO_CONFIGURATION_${configurationName.toUpperCase()}`,
    PRODUCT_BUNDLE_IDENTIFIER: bundleIdentifier,
    PRODUCT_NAME: '$(TARGET_NAME)',
    SWIFT_OPTIMIZATION_LEVEL: '-Onone',
    SWIFT_VERSION: '5.0',
    TARGETED_DEVICE_FAMILY: '1,2',
    ...(codeSigning.codeSignStyle ? { CODE_SIGN_STYLE: codeSigning.codeSignStyle } : {}),
    ...(codeSigning.developmentTeam ? { DEVELOPMENT_TEAM: codeSigning.developmentTeam } : {}),
  }

  buildSettings.APPLICATION_EXTENSION_API_ONLY = 'YES'
  buildSettings.INFOPLIST_OUTPUT_FORMAT = 'xml'

  if (codeSigning.provisioningProfileSpecifier) {
    buildSettings.PROVISIONING_PROFILE_SPECIFIER = codeSigning.provisioningProfileSpecifier
  }

  return buildSettings
}

function getWidgetTarget(context: IOSXcodeProjectContext, targetName: string): PBXNativeTarget {
  const target = getWidgetTargetOptional(context, targetName)

  if (!target) {
    throw new IOSWidgetTargetMutationError(`Xcode project does not contain widget target '${targetName}' after mutation.`)
  }

  return target
}

function getWidgetTargetOptional(context: IOSXcodeProjectContext, targetName: string): PBXNativeTarget | undefined {
  return context.project.rootObject.props.targets.find((target): target is PBXNativeTarget => {
    return PBXNativeTarget.is(target) && target.props.name === targetName && target.props.productType === IOS_APP_EXTENSION_PRODUCT_TYPE
  })
}

function ensureWidgetGroup(context: IOSXcodeProjectContext, targetName: string): PBXGroup {
  const existingGroup = context.mainGroup.getChildGroups().find((group) => group.getDisplayName() === targetName)
  if (existingGroup) {
    existingGroup.props.path = targetName
    return existingGroup
  }

  return ensureMainGroupChild(context, targetName)
}

function ensureProductFile(context: IOSXcodeProjectContext, targetName: string, productPath: string): PBXFileReference {
  const existingProduct = [...context.project.values()].find((object): object is PBXFileReference => {
    return PBXFileReference.is(object) && stripQuotes(object.props.path) === productPath && object.props.sourceTree === 'BUILT_PRODUCTS_DIR'
  })

  if (existingProduct) {
    existingProduct.props.explicitFileType = PRODUCT_FILE_TYPE
    existingProduct.props.path = productPath
    existingProduct.props.sourceTree = 'BUILT_PRODUCTS_DIR'
    return existingProduct
  }

  return context.productsGroup.createNewProductRefForTarget(targetName, 'appExtension')
}

function ensureTargetDependency(context: IOSXcodeProjectContext, widgetTarget: PBXNativeTarget): void {
  context.mainAppTarget.target.addDependency(widgetTarget)

  const copyFilesPhase = context.mainAppTarget.getCopyFilesBuildPhaseFor(widgetTarget)
  copyFilesPhase.ensureDefaultsForTarget(widgetTarget)
  copyFilesPhase.props.name = COPY_FILES_PHASE_NAME

  const productReference = widgetTarget.props.productReference
  if (!productReference) {
    throw new IOSWidgetTargetMutationError(`Widget target '${widgetTarget.props.name}' is missing a product reference.`)
  }

  copyFilesPhase.ensureFile({ fileRef: productReference })
}

function ensureTargetAttributes(context: IOSXcodeProjectContext, widgetTarget: PBXNativeTarget): void {
  const attributes = context.project.rootObject.props.attributes
  const targetAttributes = (attributes.TargetAttributes ??= {}) as Record<string, { LastSwiftMigration?: string }>
  targetAttributes[widgetTarget.uuid] ??= { LastSwiftMigration: '1250' }
}

function removeStaleWidgetTargets(context: IOSXcodeProjectContext, staleTargetNames: string[]): void {
  for (const staleTargetName of staleTargetNames) {
    const staleTarget = getWidgetTargetOptional(context, staleTargetName)
    if (!staleTarget) {
      continue
    }

    staleTarget.removeFromProject()
  }
}

function ensureBuildPhases(
  context: IOSXcodeProjectContext,
  widgetTarget: PBXNativeTarget,
  productFile: PBXFileReference,
  generatedFiles: string[]
): void {
  const sources = widgetTarget.getSourcesBuildPhase()
  const resources = widgetTarget.getResourcesBuildPhase()
  widgetTarget.getFrameworksBuildPhase()

  const fileReferences = getBuildPhaseFileReferences(context, generatedFiles)

  for (const fileReference of fileReferences) {
    const relativePath = getReferenceRelativePath(context, fileReference)

    if (isSourceFile(relativePath)) {
      sources.ensureFile({ fileRef: fileReference })
      continue
    }

    if (isResourceFile(relativePath)) {
      resources.ensureFile({ fileRef: fileReference })
    }
  }

  const copyFilesPhase = context.mainAppTarget.getCopyFilesBuildPhaseFor(widgetTarget)
  copyFilesPhase.ensureDefaultsForTarget(widgetTarget)
  copyFilesPhase.props.name = COPY_FILES_PHASE_NAME
  copyFilesPhase.ensureFile({ fileRef: productFile })
}

function getBuildPhaseFileReferences(context: IOSXcodeProjectContext, generatedFiles: string[]): PBXFileReference[] {
  const references = new Map<string, PBXFileReference>()

  for (const file of generatedFiles) {
    const buildPhasePath = getBuildPhaseReferencePath(file)
    if (!buildPhasePath || references.has(buildPhasePath)) {
      continue
    }

    references.set(buildPhasePath, ensureGeneratedFileReference(context, buildPhasePath))
  }

  return [...references.values()]
}

function removeStaleGeneratedFileReferences(
  context: IOSXcodeProjectContext,
  widgetTarget: PBXNativeTarget,
  widgetGroup: PBXGroup,
  previousGeneratedFiles: string[],
  generatedFiles: string[]
): void {
  const staleReferencePaths = getStaleReferencePaths(previousGeneratedFiles, generatedFiles)

  if (staleReferencePaths.size === 0) {
    return
  }

  const staleReferences = [...context.project.values()].filter((object): object is PBXFileReference => {
    if (!PBXFileReference.is(object)) {
      return false
    }

    const relativePath = getReferenceRelativePath(context, object)
    return staleReferencePaths.has(relativePath)
  })

  for (const reference of staleReferences) {
    removeFileReferenceFromTargetBuildPhases(widgetTarget, reference)
    removeFileReferenceFromGroupTree(widgetGroup, reference)
    reference.removeFromProject()
  }
}

function ensureWidgetGroupFiles(
  context: IOSXcodeProjectContext,
  widgetGroup: PBXGroup,
  targetName: string,
  generatedFiles: string[]
): void {
  const groupedReferencePaths = new Set<string>()

  for (const file of generatedFiles) {
    const groupReferencePath = getGroupReferencePath(file)
    if (!groupReferencePath || groupedReferencePaths.has(groupReferencePath)) {
      continue
    }

    groupedReferencePaths.add(groupReferencePath)
    const reference = ensureGeneratedFileReference(context, groupReferencePath)
    const relativeToTarget = getPathRelativeToTarget(groupReferencePath, targetName)

    if (!relativeToTarget) {
      continue
    }

    if (relativeToTarget.includes('/')) {
      const parentGroup = ensureParentGroup(widgetGroup, relativeToTarget)
      removeGroupReference(widgetGroup, reference)
      ensureGroupContainsReference(parentGroup, reference)
      continue
    }

    ensureGroupContainsReference(widgetGroup, reference)
  }
}

function removeEmptyWidgetGroups(context: IOSXcodeProjectContext, staleTargetNames: string[]): void {
  for (const staleTargetName of staleTargetNames) {
    const staleGroup = context.mainGroup.getChildGroups().find((group) => group.getDisplayName() === staleTargetName)

    if (!staleGroup || staleGroup.props.children.length > 0) {
      continue
    }

    staleGroup.removeFromProject()
  }
}

function removeFileReferenceFromTargetBuildPhases(target: PBXNativeTarget, reference: PBXFileReference): void {
  for (const phase of [target.getSourcesBuildPhase(), target.getResourcesBuildPhase(), target.getFrameworksBuildPhase()]) {
    removeBuildPhaseReference(phase, reference)
  }
}

function removeBuildPhaseReference(
  phase: PBXSourcesBuildPhase | PBXResourcesBuildPhase | PBXFrameworksBuildPhase,
  reference: PBXFileReference
): void {
  if (phase.includesFile(reference)) {
    phase.removeFileReference(reference)
  }
}

function ensureGeneratedFileReference(context: IOSXcodeProjectContext, relativeFilePath: string): PBXFileReference {
  const absolutePath = path.join(context.project.getProjectRoot(), relativeFilePath)
  const existingReference = context.project.getReferenceForPath(absolutePath)

  if (existingReference) {
    applyFileType(existingReference, relativeFilePath)
    return existingReference
  }

  const targetName = path.dirname(relativeFilePath).split(path.sep)[0]
  const widgetGroup = ensureWidgetGroup(context, targetName)
  const pathWithinGroup = getPathRelativeToTarget(relativeFilePath, targetName)

  if (!pathWithinGroup) {
    throw new IOSWidgetTargetMutationError(`Generated iOS file is outside widget target directory: ${relativeFilePath}`)
  }

  const parentGroup = ensureParentGroup(widgetGroup, pathWithinGroup)
  const fileReference = parentGroup.createFile({ path: path.basename(pathWithinGroup) })
  applyFileType(fileReference, relativeFilePath)
  return fileReference
}

function ensureParentGroup(rootGroup: PBXGroup, relativePath: string): PBXGroup {
  const directories = path.dirname(relativePath)
  if (directories === '.' || directories === '') {
    return rootGroup
  }

  const group = rootGroup.mkdir(directories.split(path.sep), { recursive: true })
  if (!group) {
    throw new IOSWidgetTargetMutationError(`Failed to create Xcode group path for ${relativePath}`)
  }

  return group
}

function ensureGroupContainsReference(group: PBXGroup, reference: PBXFileReference): void {
  const alreadyPresent = group.props.children.some((child) => child.uuid === reference.uuid)
  if (!alreadyPresent) {
    group.props.children.push(reference)
  }
}

function removeGroupReference(group: PBXGroup, reference: PBXFileReference): void {
  group.props.children = group.props.children.filter((child) => child.uuid !== reference.uuid)
}

function applyFileType(reference: PBXFileReference, relativePath: string): void {
  const extension = path.extname(relativePath)

  if (extension === '.swift') {
    reference.setLastKnownFileType(SWIFT_FILE_TYPE)
    return
  }

  if (extension === '.plist') {
    reference.setLastKnownFileType(PLIST_FILE_TYPE)
    return
  }

  if (extension === '.entitlements') {
    reference.setLastKnownFileType('text.plist.entitlements')
    return
  }

  if (extension === '.strings') {
    reference.setLastKnownFileType(STRINGS_FILE_TYPE)
    return
  }

  if (extension === '.xcassets') {
    reference.setLastKnownFileType(ASSET_CATALOG_FILE_TYPE)
    return
  }
}

function isSourceFile(relativePath: string): boolean {
  return SOURCE_EXTENSIONS.has(path.extname(relativePath))
}

function isResourceFile(relativePath: string): boolean {
  const extension = path.extname(relativePath)
  return RESOURCE_EXTENSIONS.has(extension) || relativePath.endsWith('.xcassets')
}

function getBuildPhaseReferencePath(relativePath: string): string {
  const normalizedPath = normalizeRelativePath(relativePath)
  const assetCatalogIndex = normalizedPath.indexOf('/Assets.xcassets/')

  if (assetCatalogIndex >= 0) {
    return normalizedPath.slice(0, assetCatalogIndex + '/Assets.xcassets'.length)
  }

  return normalizedPath
}

function getStaleReferencePaths(previousGeneratedFiles: string[], generatedFiles: string[]): Set<string> {
  const currentReferencePaths = new Set(generatedFiles.flatMap((file) => [getBuildPhaseReferencePath(file), getGroupReferencePath(file)]))
  const previousReferencePaths = new Set(previousGeneratedFiles.flatMap((file) => [getBuildPhaseReferencePath(file), getGroupReferencePath(file)]))

  return new Set([...previousReferencePaths].filter((referencePath) => !currentReferencePaths.has(referencePath)))
}

function getGroupReferencePath(relativePath: string): string {
  const normalizedPath = normalizeRelativePath(relativePath)
  const assetCatalogIndex = normalizedPath.indexOf('/Assets.xcassets/')

  if (assetCatalogIndex >= 0) {
    return normalizedPath.slice(0, assetCatalogIndex + '/Assets.xcassets'.length)
  }

  return normalizedPath
}

function getReferenceRelativePath(context: IOSXcodeProjectContext, reference: PBXFileReference): string {
  const segments = [stripQuotes(reference.props.path ?? '')].filter((segment) => segment.length > 0)
  let parent = getPreferredParentGroup(reference)

  while (parent && parent.uuid !== context.mainGroup.uuid) {
    const parentPath = stripQuotes(parent.props.path ?? parent.props.name ?? '')
    if (parentPath.length > 0) {
      segments.unshift(parentPath)
    }

    parent = getPreferredParentGroup(parent)
  }

  if (segments.length === 0) {
    throw new IOSWidgetTargetMutationError(`Unable to resolve Xcode file reference path for ${reference.uuid}`)
  }

  return normalizeRelativePath(segments.join('/'))
}

function getPreferredParentGroup(object: PBXFileReference | PBXGroup): PBXGroup | undefined {
  const parentGroups = object.getReferrers().filter((referrer): referrer is PBXGroup => PBXGroup.is(referrer))

  if (parentGroups.length <= 1) {
    return parentGroups[0]
  }

  return [...parentGroups].sort((left, right) => getGroupSpecificity(right) - getGroupSpecificity(left))[0]
}

function getGroupSpecificity(group: PBXGroup): number {
  const identifier = group.props.path ?? group.props.name ?? group.getDisplayName()

  if (identifier.endsWith('.imageset')) {
    return 4
  }

  if (identifier.endsWith('.xcassets') || identifier.endsWith('.lproj')) {
    return 3
  }

  return 1
}

function sanitizeWidgetGroupChildren(widgetGroup: PBXGroup): void {
  const staleChildren = widgetGroup.props.children.filter((child) => {
    const identifier = stripQuotes('path' in child && typeof child.props.path === 'string' ? child.props.path : child.getDisplayName())

    if (identifier.endsWith('.imageset')) {
      return true
    }

    return PBXGroup.is(child) && identifier.endsWith('.xcassets')
  })

  widgetGroup.props.children = widgetGroup.props.children.filter((child) => !staleChildren.includes(child))

  for (const child of staleChildren) {
    if (PBXGroup.is(child)) {
      removeGroupTree(child)
      continue
    }

    child.removeFromProject()
  }
}

function removeGroupTree(group: PBXGroup): void {
  const childGroups = [...group.getChildGroups()]
  const childFiles = group.props.children.filter((child): child is PBXFileReference => PBXFileReference.is(child))

  for (const childGroup of childGroups) {
    removeGroupTree(childGroup)
  }

  for (const childFile of childFiles) {
    childFile.removeFromProject()
  }

  group.removeFromProject()
}

function removeFileReferenceFromGroupTree(group: PBXGroup, reference: PBXFileReference): void {
  group.props.children = group.props.children.filter((child) => child.uuid !== reference.uuid)

  for (const childGroup of group.getChildGroups()) {
    removeFileReferenceFromGroupTree(childGroup, reference)
  }
}

function getPathRelativeToTarget(relativePath: string, targetName: string): string | null {
  const normalizedPath = normalizeRelativePath(relativePath)
  if (!normalizedPath.startsWith(`${targetName}/`)) {
    return null
  }

  return normalizedPath.slice(targetName.length + 1)
}

function getStaleWidgetTargetNames(previousGeneratedFiles: string[], targetName: string): string[] {
  return [
    ...new Set(
      previousGeneratedFiles
        .map(getWidgetTargetNameFromGeneratedPath)
        .filter((candidate): candidate is string => candidate !== undefined && candidate !== targetName)
    ),
  ].sort()
}

function getWidgetTargetNameFromGeneratedPath(relativePath: string): string | undefined {
  const normalizedPath = normalizeRelativePath(relativePath)
  const [targetName] = normalizedPath.split(path.sep, 1)

  return typeof targetName === 'string' && targetName.length > 0 ? targetName : undefined
}

function normalizeGeneratedFilePaths(generatedFiles: string[], projectRoot: string, discovery: IOSProjectDiscovery): string[] {
  const iosRootRelativePath = normalizeRelativePath(path.relative(projectRoot, discovery.iosRoot))
  const iosRootRelativePrefix = iosRootRelativePath === '.' ? '' : `${iosRootRelativePath}/`

  return [...new Set(generatedFiles.map((file) => toIOSProjectRelativePath(file, iosRootRelativePrefix)).filter(isDefined))].sort()
}

function toIOSProjectRelativePath(relativeFilePath: string, iosRootRelativePrefix: string): string | undefined {
  const normalizedPath = normalizeRelativePath(relativeFilePath)

  if (iosRootRelativePrefix.length === 0) {
    return normalizedPath
  }

  if (normalizedPath.startsWith(iosRootRelativePrefix)) {
    return normalizedPath.slice(iosRootRelativePrefix.length)
  }

  return undefined
}

function resolveBundleIdentifier(context: IOSXcodeProjectContext, discovery: IOSProjectDiscovery, targetName: string): string {
  const mainTargetBundleIdentifier = context.mainAppTarget.buildConfigurations.default.resolveBuildSetting('PRODUCT_BUNDLE_IDENTIFIER')

  if (typeof mainTargetBundleIdentifier !== 'string' || mainTargetBundleIdentifier.length === 0) {
    throw new IOSWidgetTargetMutationError(
      `Main app target '${discovery.mainTargetName}' is missing PRODUCT_BUNDLE_IDENTIFIER in ${discovery.pbxprojPath}`
    )
  }

  return `${stripQuotes(mainTargetBundleIdentifier)}.${sanitizeBundleIdentifierSegment(targetName)}`
}

function sanitizeBundleIdentifierSegment(targetName: string): string {
  const sanitized = targetName.replace(/[^A-Za-z0-9-]/g, '-')
  return sanitized.replace(/-+/g, '-').replace(/^-+|-+$/g, '')
}

function getMainAppCodeSigningSettings(context: IOSXcodeProjectContext): MainAppCodeSigningSettings {
  const buildSettings = context.mainAppTarget.buildConfigurations.default.props.buildSettings ?? {}

  return {
    codeSignStyle: readBuildSettingString(buildSettings.CODE_SIGN_STYLE),
    developmentTeam: readBuildSettingString(buildSettings.DEVELOPMENT_TEAM),
    provisioningProfileSpecifier: readBuildSettingString((buildSettings as unknown as { PROVISIONING_PROFILE_SPECIFIER?: unknown }).PROVISIONING_PROFILE_SPECIFIER),
  }
}

function getMainAppEntitlementsBuildSetting(projectRoot: string, discovery: IOSProjectDiscovery): string | undefined {
  if (!discovery.entitlementsPath) {
    return undefined
  }

  return normalizeRelativePath(path.relative(discovery.iosRoot, discovery.entitlementsPath))
}

function ensureMainAppEntitlementsBuildSetting(
  context: IOSXcodeProjectContext,
  entitlementsPath: string | undefined
): void {
  for (const config of context.mainAppTarget.buildConfigurations.all) {
    if (entitlementsPath) {
      config.props.buildSettings.CODE_SIGN_ENTITLEMENTS = entitlementsPath
      continue
    }

    delete config.props.buildSettings.CODE_SIGN_ENTITLEMENTS
  }
}

interface MainAppCodeSigningSettings {
  codeSignStyle?: string
  developmentTeam?: string
  provisioningProfileSpecifier?: string
}

function readBuildSettingString(value: unknown): string | undefined {
  return typeof value === 'string' ? stripQuotes(value) : undefined
}

function stripQuotes(value: string | undefined): string {
  return value?.replace(/^"|"$/g, '') ?? ''
}

function isDefined<TValue>(value: TValue | undefined): value is TValue {
  return value !== undefined
}
