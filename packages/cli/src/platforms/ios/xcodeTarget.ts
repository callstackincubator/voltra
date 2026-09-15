import path from 'node:path'

import {
  PBXFileReference,
  PBXFrameworksBuildPhase,
  PBXGroup,
  PBXNativeTarget,
  PBXResourcesBuildPhase,
  PBXShellScriptBuildPhase,
  PBXSourcesBuildPhase,
  XCBuildConfiguration,
  XCConfigurationList,
} from '@bacons/xcode'

import { normalizeRelativePath, toRelativePath } from '../../fs/path'
import { pathExists } from '../../fs/readWrite'
import { VoltraCliError } from '../../reporting/summary'
import { resolveIOSWidgetTargetName } from './targetName'
import { ensureMainGroupChild, openIOSXcodeProject, saveIOSXcodeProject } from './xcode'
import { resolveMainAppEntitlementsPath } from './mainAppEntitlements'
import { needsEntitlementsMutation } from './entitlements'
import { VOLTRA_OWNED_BUILD_SETTINGS } from './buildConfigurationValues'
import { VOLTRA_MIN_IOS_DEPLOYMENT_TARGET, maxIOSDeploymentTarget } from './deploymentTarget'

import type { IOSProjectDiscovery } from '../../discovery/ios'
import type { ResolvedVoltraIOSConfig } from '../../config/types'
import type { ReportedChange } from '../../reporting/summary'
import type { IOSXcodeProjectContext } from './xcode'
import type { BuildSettings } from '@bacons/xcode/build/json/types'

const IOS_APP_EXTENSION_PRODUCT_TYPE = 'com.apple.product-type.app-extension'
const OPTIONAL_WIDGET_CODE_SIGNING_SETTINGS = [
  'CODE_SIGN_STYLE',
  'DEVELOPMENT_TEAM',
  'PROVISIONING_PROFILE_SPECIFIER',
] as const
const PRODUCT_FILE_TYPE = 'wrapper.app-extension'
const SWIFT_FILE_TYPE = 'sourcecode.swift'
const STRINGS_FILE_TYPE = 'text.plist.strings'
const PLIST_FILE_TYPE = 'text.plist.xml'
const ASSET_CATALOG_FILE_TYPE = 'folder.assetcatalog'
const COPY_FILES_PHASE_NAME = 'Embed Foundation Extensions'
const DYNAMIC_WIDGET_BUNDLE_PHASE_NAME = 'Bundle Voltra Dynamic Widgets'
const SOURCE_EXTENSIONS = new Set(['.swift'])
const RESOURCE_EXTENSIONS = new Set(['.xcassets', '.strings', '.ttf', '.otf', '.woff', '.woff2'])
const DYNAMIC_WIDGET_BUNDLE_SHELL_SCRIPT = `if [[ "$CONFIGURATION" == *Debug* ]]; then
  echo "Voltra: Debug build - Dynamic Widgets load from Metro, skipping bundling"
  exit 0
fi

if [[ -f "$SRCROOT/.xcode.env" ]]; then
  source "$SRCROOT/.xcode.env"
fi
if [[ -f "$SRCROOT/.xcode.env.local" ]]; then
  source "$SRCROOT/.xcode.env.local"
fi

export PROJECT_ROOT="\${PROJECT_ROOT:-$SRCROOT/..}"
NODE_BINARY="\${NODE_BINARY:-node}"

BUNDLER="$("$NODE_BINARY" - "$PROJECT_ROOT" <<'NODE'
const { createRequire } = require('node:module')
const path = require('node:path')

const projectRoot = process.argv[2]
const requireFromProject = createRequire(path.join(projectRoot, 'package.json'))

try {
  const resolved = requireFromProject.resolve('@use-voltra/metro/bundle-widgets')
  process.stdout.write(resolved)
} catch (error) {
  console.error(
    'error: Voltra widget bundler could not resolve @use-voltra/metro from ' +
      projectRoot +
      '. Install @use-voltra/metro in app project so release widgets can be baked.'
  )
  console.error(error && error.message ? error.message : String(error))
  process.exit(1)
}
NODE
)"
if [[ -z "$BUNDLER" ]]; then
  echo "Voltra: resolver returned empty string for @use-voltra/metro/bundle-widgets" >&2
  exit 1
fi

echo "Voltra: widget bundler resolved to $BUNDLER"
"$NODE_BINARY" "$BUNDLER" --out-dir "$TARGET_BUILD_DIR/$UNLOCALIZED_RESOURCES_FOLDER_PATH" --platform ios --project-root "$PROJECT_ROOT"
`

export interface EnsureIOSWidgetTargetOptions {
  projectRoot: string
  ios: ResolvedVoltraIOSConfig
  discovery: IOSProjectDiscovery
  generatedFiles: string[]
  previousGeneratedFiles?: string[]
  /** User-defined build settings to write at project level, keyed by build configuration name. */
  buildSettings?: Map<string, Record<string, string>>
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

export async function ensureIOSWidgetTarget(
  options: EnsureIOSWidgetTargetOptions
): Promise<EnsureIOSWidgetTargetResult> {
  const { projectRoot, ios, discovery, generatedFiles, previousGeneratedFiles, buildSettings } = options
  const targetName = resolveIOSWidgetTargetName(ios, discovery)
  const context = openIOSXcodeProject(discovery)
  const beforeSerialized = JSON.stringify(context.project.toJSON())
  const productPath = `${targetName}.appex`
  const nextGeneratedFiles = normalizeGeneratedFilePaths(generatedFiles, projectRoot, discovery)
  const previousWidgetFiles = normalizeGeneratedFilePaths(previousGeneratedFiles ?? [], projectRoot, discovery)
  const staleTargetNames = getStaleWidgetTargetNames(previousWidgetFiles, targetName)
  const mainAppSettings = getMainAppConfigurationSettings(context, discovery, targetName)
  const mainAppEntitlementsPath = await getMainAppEntitlementsBuildSetting(discovery, ios)

  removeStaleWidgetTargets(context, staleTargetNames)
  ensureMainAppEntitlementsBuildSetting(
    context,
    mainAppEntitlementsPath,
    ios.project.entitlementsPath !== undefined,
    getEntitlementsPathByConfiguration(discovery)
  )
  ensureMainAppDeploymentTarget(context)
  ensureWidgetTarget(context, targetName, ios.deploymentTarget, mainAppSettings)

  const widgetTarget = getWidgetTarget(context, targetName)

  ensureVoltraBuildSettings(context, widgetTarget, buildSettings ?? new Map())
  const widgetGroup = ensureWidgetGroup(context, targetName)
  const productFile = ensureProductFile(context, targetName, productPath)

  sanitizeWidgetGroupChildren(widgetGroup)

  widgetTarget.props.productReference = productFile
  widgetTarget.props.productType = IOS_APP_EXTENSION_PRODUCT_TYPE
  widgetTarget.props.productName = targetName

  ensureTargetDependency(context, widgetTarget)
  ensureTargetAttributes(context, widgetTarget)
  ensureDynamicWidgetBundlePhase(
    widgetTarget,
    ios.widgets.some((widget) => widget.entry !== undefined)
  )
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
  deploymentTarget: string,
  mainAppSettings: MainAppSettingsByConfiguration
): PBXNativeTarget {
  const existingTarget = getWidgetTargetOptional(context, targetName)

  if (existingTarget) {
    ensureBuildConfigurations(context, existingTarget, targetName, deploymentTarget, mainAppSettings)
    return existingTarget
  }

  const buildConfigurationList = createBuildConfigurationList(context, targetName, deploymentTarget, mainAppSettings)
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
  deploymentTarget: string,
  mainAppSettings: MainAppSettingsByConfiguration
): XCConfigurationList {
  const configs = context.mainAppTarget.buildConfigurations.all.map((config) => {
    return XCBuildConfiguration.create(context.project, {
      name: config.props.name,
      buildSettings: buildWidgetBuildSettings(
        targetName,
        deploymentTarget,
        config.props.name,
        getMainAppSettingsFor(mainAppSettings, config.props.name)
      ),
    })
  })

  return XCConfigurationList.create(context.project, {
    buildConfigurations: configs,
    defaultConfigurationName: context.mainAppTarget.buildConfigurations.default.props.name,
  })
}

function ensureBuildConfigurations(
  context: IOSXcodeProjectContext,
  target: PBXNativeTarget,
  targetName: string,
  minimumDeploymentTarget: string,
  mainAppSettings: MainAppSettingsByConfiguration
): void {
  const configurationList = target.props.buildConfigurationList

  if (!configurationList) {
    throw new IOSWidgetTargetMutationError(
      `Widget target '${target.props.name}' is missing a build configuration list.`
    )
  }

  addMissingWidgetBuildConfigurations(context, configurationList, targetName, minimumDeploymentTarget, mainAppSettings)

  for (const config of configurationList.props.buildConfigurations) {
    const deploymentTarget = resolveBuildConfigurationDeploymentTarget(config, minimumDeploymentTarget)

    const nextBuildSettings = buildWidgetBuildSettings(
      targetName,
      deploymentTarget,
      config.props.name,
      getMainAppSettingsFor(mainAppSettings, config.props.name)
    )

    Object.assign(config.props.buildSettings, nextBuildSettings)

    // Signing settings the app configuration no longer sets are dropped rather than left behind,
    // now that each configuration can change independently of the default one.
    for (const settingName of OPTIONAL_WIDGET_CODE_SIGNING_SETTINGS) {
      if (nextBuildSettings[settingName] === undefined) {
        delete (config.props.buildSettings as unknown as Record<string, unknown>)[settingName]
      }
    }
  }
}

/**
 * Mirrors build configurations added to the app since the widget target was created, so an
 * environment added later still builds the extension.
 */
function addMissingWidgetBuildConfigurations(
  context: IOSXcodeProjectContext,
  configurationList: XCConfigurationList,
  targetName: string,
  minimumDeploymentTarget: string,
  mainAppSettings: MainAppSettingsByConfiguration
): void {
  const existingNames = new Set(configurationList.props.buildConfigurations.map((config) => config.props.name))

  for (const config of context.mainAppTarget.buildConfigurations.all) {
    const configurationName = config.props.name

    if (existingNames.has(configurationName)) {
      continue
    }

    configurationList.props.buildConfigurations.push(
      XCBuildConfiguration.create(context.project, {
        name: configurationName,
        buildSettings: buildWidgetBuildSettings(
          targetName,
          resolveBuildConfigurationDeploymentTarget(config, minimumDeploymentTarget),
          configurationName,
          getMainAppSettingsFor(mainAppSettings, configurationName)
        ),
      })
    )
  }
}

function buildWidgetBuildSettings(
  targetName: string,
  deploymentTarget: string,
  configurationName: string,
  mainAppSettings: MainAppConfigurationSettings
): BuildSettings & Record<string, string | undefined> {
  const { bundleIdentifier, codeSigning } = mainAppSettings
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
    throw new IOSWidgetTargetMutationError(
      `Xcode project does not contain widget target '${targetName}' after mutation.`
    )
  }

  return target
}

function getWidgetTargetOptional(context: IOSXcodeProjectContext, targetName: string): PBXNativeTarget | undefined {
  return context.project.rootObject.props.targets.find((target): target is PBXNativeTarget => {
    return (
      PBXNativeTarget.is(target) &&
      target.props.name === targetName &&
      target.props.productType === IOS_APP_EXTENSION_PRODUCT_TYPE
    )
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
    return (
      PBXFileReference.is(object) &&
      stripQuotes(object.props.path) === productPath &&
      object.props.sourceTree === 'BUILT_PRODUCTS_DIR'
    )
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

function ensureDynamicWidgetBundlePhase(widgetTarget: PBXNativeTarget, enabled: boolean): void {
  const matchingPhases = widgetTarget.props.buildPhases.filter(
    (phase): phase is PBXShellScriptBuildPhase =>
      PBXShellScriptBuildPhase.is(phase) && stripQuotes(phase.props.name) === DYNAMIC_WIDGET_BUNDLE_PHASE_NAME
  )

  if (!enabled) {
    for (const phase of matchingPhases) {
      phase.removeFromProject()
    }
    return
  }
  const primaryPhase =
    matchingPhases[0] ??
    widgetTarget.createBuildPhase(PBXShellScriptBuildPhase, {
      name: DYNAMIC_WIDGET_BUNDLE_PHASE_NAME,
      shellPath: '/bin/sh',
      shellScript: DYNAMIC_WIDGET_BUNDLE_SHELL_SCRIPT,
    })

  primaryPhase.props.name = DYNAMIC_WIDGET_BUNDLE_PHASE_NAME
  primaryPhase.props.shellPath = '/bin/sh'
  primaryPhase.props.shellScript = DYNAMIC_WIDGET_BUNDLE_SHELL_SCRIPT
  primaryPhase.props.alwaysOutOfDate = 1

  for (const duplicatePhase of matchingPhases.slice(1)) {
    duplicatePhase.removeFromProject()
  }
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
  for (const phase of [
    target.getSourcesBuildPhase(),
    target.getResourcesBuildPhase(),
    target.getFrameworksBuildPhase(),
  ]) {
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
  const currentReferencePaths = new Set(
    generatedFiles.flatMap((file) => [getBuildPhaseReferencePath(file), getGroupReferencePath(file)])
  )
  const previousReferencePaths = new Set(
    previousGeneratedFiles.flatMap((file) => [getBuildPhaseReferencePath(file), getGroupReferencePath(file)])
  )

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
    const identifier = stripQuotes(
      'path' in child && typeof child.props.path === 'string' ? child.props.path : child.getDisplayName()
    )

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

function normalizeGeneratedFilePaths(
  generatedFiles: string[],
  projectRoot: string,
  discovery: IOSProjectDiscovery
): string[] {
  const iosRootRelativePath = normalizeRelativePath(path.relative(projectRoot, discovery.iosRoot))
  const iosRootRelativePrefix = iosRootRelativePath === '.' ? '' : `${iosRootRelativePath}/`

  return [
    ...new Set(generatedFiles.map((file) => toIOSProjectRelativePath(file, iosRootRelativePrefix)).filter(isDefined)),
  ].sort()
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

/**
 * Widget settings are derived per build configuration: apps that ship several environments give each
 * configuration its own bundle identifier and signing setup, and the extension has to match the app
 * it is embedded in for every one of them.
 */
function getMainAppConfigurationSettings(
  context: IOSXcodeProjectContext,
  discovery: IOSProjectDiscovery,
  targetName: string
): MainAppSettingsByConfiguration {
  const defaultConfiguration = context.mainAppTarget.buildConfigurations.default
  const defaultBundleIdentifier = readMainAppBundleIdentifier(defaultConfiguration)

  if (!defaultBundleIdentifier) {
    throw new IOSWidgetTargetMutationError(
      `Main app target '${discovery.mainTargetName}' is missing PRODUCT_BUNDLE_IDENTIFIER in ${discovery.pbxprojPath}`
    )
  }

  const byConfigurationName = new Map<string, MainAppConfigurationSettings>()

  for (const config of context.mainAppTarget.buildConfigurations.all) {
    const bundleIdentifier = readMainAppBundleIdentifier(config) ?? defaultBundleIdentifier

    byConfigurationName.set(config.props.name, {
      // The raw value is kept, so an app identifier built from build settings keeps expanding.
      bundleIdentifier: `${bundleIdentifier}.${sanitizeBundleIdentifierSegment(targetName)}`,
      codeSigning: getCodeSigningSettings(config),
    })
  }

  return {
    byConfigurationName,
    fallback: {
      bundleIdentifier: `${defaultBundleIdentifier}.${sanitizeBundleIdentifierSegment(targetName)}`,
      codeSigning: getCodeSigningSettings(defaultConfiguration),
    },
  }
}

function getMainAppSettingsFor(
  mainAppSettings: MainAppSettingsByConfiguration,
  configurationName: string
): MainAppConfigurationSettings {
  return mainAppSettings.byConfigurationName.get(configurationName) ?? mainAppSettings.fallback
}

function readMainAppBundleIdentifier(config: XCBuildConfiguration): string | undefined {
  const rawBundleIdentifier = readBuildSettingString(config.props.buildSettings?.PRODUCT_BUNDLE_IDENTIFIER)

  if (rawBundleIdentifier) {
    return substituteTargetScopedBuildSettings(rawBundleIdentifier, config)
  }

  const inheritedBundleIdentifier = config.resolveBuildSetting('PRODUCT_BUNDLE_IDENTIFIER')

  if (typeof inheritedBundleIdentifier !== 'string' || inheritedBundleIdentifier.length === 0) {
    return undefined
  }

  return stripQuotes(inheritedBundleIdentifier)
}

/**
 * Substitutes the build settings whose value depends on the target being built, leaving every other
 * reference in place.
 *
 * An app identifier is routinely assembled from build settings. Those that mean something different
 * in the widget target have to be resolved against the app now — the React Native template's
 * `org.reactjs.native.example.$(PRODUCT_NAME:rfc1034identifier)` would otherwise name the widget
 * after itself and stop being a child of the app's identifier. Everything else is left unexpanded,
 * so a setting the project defines per build configuration, such as `$(BUNDLE_SUFFIX)`, keeps
 * expanding per build in the widget target too.
 */
function substituteTargetScopedBuildSettings(value: string, config: XCBuildConfiguration): string {
  return value.replace(/\$\((PRODUCT_NAME|TARGET_NAME)(?::([A-Za-z0-9]+))?\)/g, (match, settingName, modifier) => {
    const settingValue = config.resolveBuildSetting(settingName)

    if (typeof settingValue !== 'string' || settingValue.length === 0) {
      return match
    }

    return applyBuildSettingModifier(stripQuotes(settingValue), modifier) ?? match
  })
}

function applyBuildSettingModifier(value: string, modifier: string | undefined): string | undefined {
  switch (modifier) {
    case undefined:
      return value
    case 'rfc1034identifier':
      return value.replace(/[^a-zA-Z0-9]/g, '-')
    case 'lower':
      return value.toLowerCase()
    case 'upper':
      return value.toUpperCase()
    default:
      // An unsupported modifier is left for Xcode rather than guessed at.
      return undefined
  }
}

function sanitizeBundleIdentifierSegment(targetName: string): string {
  const sanitized = targetName.replace(/[^A-Za-z0-9-]/g, '-')
  return sanitized.replace(/-+/g, '-').replace(/^-+|-+$/g, '')
}

function getCodeSigningSettings(config: XCBuildConfiguration): MainAppCodeSigningSettings {
  const buildSettings = config.props.buildSettings ?? {}

  return {
    codeSignStyle: readBuildSettingString(buildSettings.CODE_SIGN_STYLE),
    developmentTeam: readBuildSettingString(buildSettings.DEVELOPMENT_TEAM),
    provisioningProfileSpecifier: readBuildSettingString(
      (buildSettings as unknown as { PROVISIONING_PROFILE_SPECIFIER?: unknown }).PROVISIONING_PROFILE_SPECIFIER
    ),
  }
}

async function getMainAppEntitlementsBuildSetting(
  discovery: IOSProjectDiscovery,
  ios: ResolvedVoltraIOSConfig
): Promise<string | undefined> {
  if (discovery.entitlementsPath) {
    return normalizeRelativePath(path.relative(discovery.iosRoot, discovery.entitlementsPath))
  }

  if (!needsEntitlementsMutation(ios)) {
    return undefined
  }

  const entitlementsPath = resolveMainAppEntitlementsPath(discovery)

  if (!(await pathExists(entitlementsPath))) {
    return undefined
  }

  return normalizeRelativePath(path.relative(discovery.iosRoot, entitlementsPath))
}

/**
 * Writes the user-defined build settings that hold Voltra's per-build-configuration values.
 *
 * They are set on the app and widget targets rather than on the project, so the build
 * configurations written to are exactly the ones the values were validated against: a target can
 * carry a configuration the project-level list does not have, and a value silently dropped there
 * would expand to an empty App Group at build time. Settings Voltra no longer defines are removed.
 */
function ensureVoltraBuildSettings(
  context: IOSXcodeProjectContext,
  widgetTarget: PBXNativeTarget,
  buildSettings: Map<string, Record<string, string>>
): void {
  const configurations = [
    ...context.mainAppTarget.buildConfigurations.all,
    ...(widgetTarget.props.buildConfigurationList?.props.buildConfigurations ?? []),
  ]

  for (const config of configurations) {
    const configurationSettings = config.props.buildSettings as unknown as Record<string, string | undefined>
    const nextSettings = buildSettings.get(config.props.name) ?? {}

    for (const settingName of VOLTRA_OWNED_BUILD_SETTINGS) {
      if (nextSettings[settingName] === undefined) {
        delete configurationSettings[settingName]
      }
    }

    Object.assign(configurationSettings, nextSettings)
  }
}

function getEntitlementsPathByConfiguration(discovery: IOSProjectDiscovery): Map<string, string> {
  return new Map(
    [...(discovery.entitlementsPathByConfiguration ?? [])].map(([buildConfigurationName, entitlementsPath]) => [
      buildConfigurationName,
      normalizeRelativePath(path.relative(discovery.iosRoot, entitlementsPath)),
    ])
  )
}

function ensureMainAppEntitlementsBuildSetting(
  context: IOSXcodeProjectContext,
  entitlementsPath: string | undefined,
  isConfiguredExplicitly: boolean,
  entitlementsPathByConfiguration: Map<string, string>
): void {
  for (const config of context.mainAppTarget.buildConfigurations.all) {
    const configuredEntitlementsPath = entitlementsPathByConfiguration.get(config.props.name)

    if (configuredEntitlementsPath) {
      config.props.buildSettings.CODE_SIGN_ENTITLEMENTS = configuredEntitlementsPath
      continue
    }

    if (!entitlementsPath) {
      delete config.props.buildSettings.CODE_SIGN_ENTITLEMENTS
      continue
    }

    // A build configuration pointing at its own entitlements file keeps it, unless the config file
    // named one explicitly.
    if (!isConfiguredExplicitly && readBuildSettingString(config.props.buildSettings.CODE_SIGN_ENTITLEMENTS)) {
      continue
    }

    config.props.buildSettings.CODE_SIGN_ENTITLEMENTS = entitlementsPath
  }
}

function ensureMainAppDeploymentTarget(context: IOSXcodeProjectContext): void {
  for (const config of context.mainAppTarget.buildConfigurations.all) {
    config.props.buildSettings.IPHONEOS_DEPLOYMENT_TARGET = resolveBuildConfigurationDeploymentTarget(
      config,
      VOLTRA_MIN_IOS_DEPLOYMENT_TARGET
    )
  }
}

function resolveBuildConfigurationDeploymentTarget(
  config: XCBuildConfiguration,
  minimumDeploymentTarget: string
): string {
  const currentDeploymentTarget = readBuildSettingString(config.props.buildSettings.IPHONEOS_DEPLOYMENT_TARGET)
  return currentDeploymentTarget
    ? maxIOSDeploymentTarget(currentDeploymentTarget, minimumDeploymentTarget)
    : minimumDeploymentTarget
}

interface MainAppCodeSigningSettings {
  codeSignStyle?: string
  developmentTeam?: string
  provisioningProfileSpecifier?: string
}

interface MainAppConfigurationSettings {
  bundleIdentifier: string
  codeSigning: MainAppCodeSigningSettings
}

interface MainAppSettingsByConfiguration {
  byConfigurationName: Map<string, MainAppConfigurationSettings>
  /** Used for widget build configurations the main app target does not have. */
  fallback: MainAppConfigurationSettings
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
