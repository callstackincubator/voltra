import path from 'node:path'

import { PBXFileReference, PBXGroup, PBXNativeTarget, XCBuildConfiguration, XCConfigurationList } from '@bacons/xcode'

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
  const { projectRoot, ios, discovery, generatedFiles } = options
  const targetName = resolveIOSWidgetTargetName(ios, discovery)
  const context = openIOSXcodeProject(discovery)
  const beforeSerialized = JSON.stringify(context.project.toJSON())
  const productPath = `${targetName}.appex`
  const nextGeneratedFiles = normalizeGeneratedFilePaths(generatedFiles, projectRoot, discovery)
  const bundleIdentifier = resolveBundleIdentifier(context, discovery, targetName)
  const codeSigning = getMainAppCodeSigningSettings(context)

  ensureWidgetTarget(context, targetName, bundleIdentifier, ios.deploymentTarget, codeSigning)

  const widgetTarget = getWidgetTarget(context, targetName)
  const widgetGroup = ensureWidgetGroup(context, targetName)
  const productFile = ensureProductFile(context, targetName, productPath)

  widgetTarget.props.productReference = productFile
  widgetTarget.props.productType = IOS_APP_EXTENSION_PRODUCT_TYPE
  widgetTarget.props.productName = targetName

  ensureTargetDependency(context, widgetTarget)
  ensureTargetAttributes(context, widgetTarget)
  ensureBuildPhases(context, widgetTarget, productFile, nextGeneratedFiles)
  ensureWidgetGroupFiles(context, widgetGroup, targetName, nextGeneratedFiles)

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
    ASSETCATALOG_COMPILER_APPICON_NAME: '""',
    CODE_SIGN_ENTITLEMENTS: `"${targetName}/${targetName}.entitlements"`,
    CURRENT_PROJECT_VERSION: '1',
    INFOPLIST_FILE: `${targetName}/Info.plist`,
    INFOPLIST_OUTPUT_FORMAT: 'xml',
    IPHONEOS_DEPLOYMENT_TARGET: `"${deploymentTarget}"`,
    MARKETING_VERSION: '1.0',
    OTHER_SWIFT_FLAGS: `"$(inherited) -D EXPO_CONFIGURATION_${configurationName.toUpperCase()}"`,
    PRODUCT_BUNDLE_IDENTIFIER: `"${bundleIdentifier}"`,
    PRODUCT_NAME: '"$(TARGET_NAME)"',
    SWIFT_OPTIMIZATION_LEVEL: '"-Onone"',
    SWIFT_VERSION: '5.0',
    TARGETED_DEVICE_FAMILY: '"1,2"',
    ...(codeSigning.codeSignStyle ? { CODE_SIGN_STYLE: `"${codeSigning.codeSignStyle}"` } : {}),
    ...(codeSigning.developmentTeam ? { DEVELOPMENT_TEAM: `"${codeSigning.developmentTeam}"` } : {}),
  }

  buildSettings.APPLICATION_EXTENSION_API_ONLY = 'YES'
  buildSettings.INFOPLIST_OUTPUT_FORMAT = 'xml'

  if (codeSigning.provisioningProfileSpecifier) {
    buildSettings.PROVISIONING_PROFILE_SPECIFIER = `"${codeSigning.provisioningProfileSpecifier}"`
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

function ensureBuildPhases(
  context: IOSXcodeProjectContext,
  widgetTarget: PBXNativeTarget,
  productFile: PBXFileReference,
  generatedFiles: string[]
): void {
  const sources = widgetTarget.getSourcesBuildPhase()
  const resources = widgetTarget.getResourcesBuildPhase()
  widgetTarget.getFrameworksBuildPhase()

  const fileReferences = generatedFiles.map((file) => ensureGeneratedFileReference(context, file))

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

function ensureWidgetGroupFiles(
  context: IOSXcodeProjectContext,
  widgetGroup: PBXGroup,
  targetName: string,
  generatedFiles: string[]
): void {
  const localizedGroups = new Map<string, PBXGroup>()

  for (const file of generatedFiles) {
    const reference = ensureGeneratedFileReference(context, file)
    const relativeToTarget = getPathRelativeToTarget(file, targetName)

    if (!relativeToTarget) {
      continue
    }

    if (relativeToTarget.includes('/')) {
      const [groupName] = relativeToTarget.split('/', 1)
      if (groupName.endsWith('.lproj')) {
        const localeGroup = localizedGroups.get(groupName) ?? ensureChildGroup(widgetGroup, groupName, groupName)
        localizedGroups.set(groupName, localeGroup)
        ensureGroupContainsReference(localeGroup, reference)
        continue
      }
    }

    ensureGroupContainsReference(widgetGroup, reference)
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

function ensureChildGroup(parent: PBXGroup, name: string, relativePath: string): PBXGroup {
  const existingGroup = parent.getChildGroups().find((group) => group.getDisplayName() === name)
  if (existingGroup) {
    existingGroup.props.path = relativePath
    return existingGroup
  }

  return parent.createGroup({ name, path: relativePath, sourceTree: '<group>' })
}

function ensureGroupContainsReference(group: PBXGroup, reference: PBXFileReference): void {
  const alreadyPresent = group.props.children.some((child) => child.uuid === reference.uuid)
  if (!alreadyPresent) {
    group.props.children.push(reference)
  }
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

function getReferenceRelativePath(context: IOSXcodeProjectContext, reference: PBXFileReference): string {
  return normalizeRelativePath(path.relative(context.project.getProjectRoot(), reference.getFullPath()))
}

function getPathRelativeToTarget(relativePath: string, targetName: string): string | null {
  const normalizedPath = normalizeRelativePath(relativePath)
  if (!normalizedPath.startsWith(`${targetName}/`)) {
    return null
  }

  return normalizedPath.slice(targetName.length + 1)
}

function normalizeGeneratedFilePaths(generatedFiles: string[], projectRoot: string, discovery: IOSProjectDiscovery): string[] {
  const iosRootRelativePath = normalizeRelativePath(path.relative(projectRoot, discovery.iosRoot))
  const iosRootRelativePrefix = iosRootRelativePath === '.' ? '' : `${iosRootRelativePath}/`

  return [...new Set(generatedFiles.map((file) => toIOSProjectRelativePath(file, iosRootRelativePrefix, discovery)))].sort()
}

function toIOSProjectRelativePath(
  relativeFilePath: string,
  iosRootRelativePrefix: string,
  discovery: IOSProjectDiscovery
): string {
  const normalizedPath = normalizeRelativePath(relativeFilePath)

  if (iosRootRelativePrefix.length === 0) {
    return normalizedPath
  }

  if (normalizedPath.startsWith(iosRootRelativePrefix)) {
    return normalizedPath.slice(iosRootRelativePrefix.length)
  }

  throw new IOSWidgetTargetMutationError(
    `Generated iOS file is outside the discovered iOS root '${discovery.iosRoot}': ${relativeFilePath}`
  )
}

function resolveBundleIdentifier(context: IOSXcodeProjectContext, discovery: IOSProjectDiscovery, targetName: string): string {
  const mainTargetBundleIdentifier = context.mainAppTarget.buildConfigurations.default.resolveBuildSetting('PRODUCT_BUNDLE_IDENTIFIER')

  if (typeof mainTargetBundleIdentifier !== 'string' || mainTargetBundleIdentifier.length === 0) {
    throw new IOSWidgetTargetMutationError(
      `Main app target '${discovery.mainTargetName}' is missing PRODUCT_BUNDLE_IDENTIFIER in ${discovery.pbxprojPath}`
    )
  }

  return `${stripQuotes(mainTargetBundleIdentifier)}.${targetName}`
}

function getMainAppCodeSigningSettings(context: IOSXcodeProjectContext): MainAppCodeSigningSettings {
  const buildSettings = context.mainAppTarget.buildConfigurations.default.props.buildSettings ?? {}

  return {
    codeSignStyle: readBuildSettingString(buildSettings.CODE_SIGN_STYLE),
    developmentTeam: readBuildSettingString(buildSettings.DEVELOPMENT_TEAM),
    provisioningProfileSpecifier: readBuildSettingString((buildSettings as unknown as { PROVISIONING_PROFILE_SPECIFIER?: unknown }).PROVISIONING_PROFILE_SPECIFIER),
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
