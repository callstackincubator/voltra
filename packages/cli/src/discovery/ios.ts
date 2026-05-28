import fs from 'node:fs/promises'
import path from 'node:path'

import type { Stats } from 'node:fs'

import { VoltraCliError } from '../reporting/summary'

import type { NormalizedIOSProjectConfig } from '../config/types'

const PBX_NATIVE_TARGET_SECTION = 'PBXNativeTarget'
const XC_BUILD_CONFIGURATION_SECTION = 'XCBuildConfiguration'
const XC_CONFIGURATION_LIST_SECTION = 'XCConfigurationList'
const IOS_APPLICATION_PRODUCT_TYPE = 'com.apple.product-type.application'

export interface IOSProjectDiscovery {
  iosRoot: string
  xcodeprojPath: string
  pbxprojPath: string
  podfilePath: string
  mainTargetName: string
  mainTargetCandidates: string[]
  infoPlistPath: string
  entitlementsPath?: string
}

interface ParsedPbxNativeTarget {
  id: string
  name: string
  productType: string
  buildConfigurationListId: string
}

interface ParsedXCConfigurationList {
  id: string
  buildConfigurationIds: string[]
  defaultConfigurationName?: string
}

interface ParsedXCBuildConfiguration {
  id: string
  name: string
  buildSettings: {
    codeSignEntitlements?: string
    infoPlistFile?: string
    productName?: string
  }
}

interface ParsedIOSProject {
  targets: ParsedPbxNativeTarget[]
  configurationLists: Map<string, ParsedXCConfigurationList>
  buildConfigurations: Map<string, ParsedXCBuildConfiguration>
}

export class IOSProjectDiscoveryError extends VoltraCliError {
  constructor(message: string) {
    super(message, 'VOLTRA_IOS_DISCOVERY_FAILED')
    this.name = 'IOSProjectDiscoveryError'
  }
}

export async function discoverIOSProject(projectRoot: string, config: NormalizedIOSProjectConfig): Promise<IOSProjectDiscovery> {
  const iosRoot = await resolveIOSRoot(projectRoot, config)
  const xcodeprojPath = await resolveXcodeprojPath(iosRoot, config)
  const pbxprojPath = await resolvePbxprojPath(xcodeprojPath)
  const podfilePath = await resolvePodfilePath(iosRoot, config)
  const pbxprojContent = await fs.readFile(pbxprojPath, 'utf8')
  const parsedProject = parseIOSProject(pbxprojContent, pbxprojPath)
  const mainTargetCandidates = getMainTargetCandidates(parsedProject.targets)
  const mainTarget = resolveMainTarget(mainTargetCandidates, config.mainTargetName, pbxprojPath)
  const mainTargetBuildConfigurations = getTargetBuildConfigurations(parsedProject, mainTarget, pbxprojPath)
  const infoPlistPath = await resolveInfoPlistPath(iosRoot, config, mainTarget, mainTargetBuildConfigurations)
  const entitlementsPath = await resolveEntitlementsPath(iosRoot, config, mainTarget, mainTargetBuildConfigurations)

  return {
    iosRoot,
    xcodeprojPath,
    pbxprojPath,
    podfilePath,
    mainTargetName: mainTarget.name,
    mainTargetCandidates: mainTargetCandidates.map((target) => target.name).sort(),
    infoPlistPath,
    entitlementsPath,
  }
}

async function resolveIOSRoot(projectRoot: string, config: NormalizedIOSProjectConfig): Promise<string> {
  const iosRoot = config.rootDir ?? path.join(projectRoot, 'ios')

  await ensureDirectory(
    iosRoot,
    config.rootDir
      ? `Configured iOS root directory does not exist: ${iosRoot}`
      : `iOS root directory does not exist at ${iosRoot}. Set ios.project.rootDir to override the default ios/ layout.`
  )

  return iosRoot
}

async function resolveXcodeprojPath(iosRoot: string, config: NormalizedIOSProjectConfig): Promise<string> {
  if (config.xcodeprojPath) {
    await ensureDirectory(config.xcodeprojPath, `Configured Xcode project does not exist: ${config.xcodeprojPath}`)

    if (!config.xcodeprojPath.endsWith('.xcodeproj')) {
      throw new IOSProjectDiscoveryError(
        `Configured Xcode project must point to a .xcodeproj directory: ${config.xcodeprojPath}`
      )
    }

    return config.xcodeprojPath
  }

  const entries = await fs.readdir(iosRoot, { withFileTypes: true })
  const xcodeprojCandidates = entries
    .filter((entry) => entry.isDirectory() && entry.name.endsWith('.xcodeproj'))
    .map((entry) => path.join(iosRoot, entry.name))
    .sort()

  if (xcodeprojCandidates.length === 1) {
    return xcodeprojCandidates[0]
  }

  if (xcodeprojCandidates.length === 0) {
    throw new IOSProjectDiscoveryError(
      `No .xcodeproj was found in ${iosRoot}. Set ios.project.xcodeprojPath to override discovery.`
    )
  }

  throw new IOSProjectDiscoveryError(
    `Multiple .xcodeproj directories were found in ${iosRoot}: ${xcodeprojCandidates.join(', ')}. Set ios.project.xcodeprojPath explicitly.`
  )
}

async function resolvePbxprojPath(xcodeprojPath: string): Promise<string> {
  const pbxprojPath = path.join(xcodeprojPath, 'project.pbxproj')
  await ensureFile(pbxprojPath, `Xcode project file is missing at ${pbxprojPath}`)
  return pbxprojPath
}

async function resolvePodfilePath(iosRoot: string, config: NormalizedIOSProjectConfig): Promise<string> {
  const podfilePath = config.podfilePath ?? path.join(iosRoot, 'Podfile')

  await ensureFile(
    podfilePath,
    config.podfilePath
      ? `Configured Podfile does not exist: ${podfilePath}`
      : `Podfile does not exist at ${podfilePath}. Set ios.project.podfilePath to override the default ios/Podfile path.`
  )

  return podfilePath
}

function parseIOSProject(content: string, pbxprojPath: string): ParsedIOSProject {
  const nativeTargetSection = getPbxprojSection(content, PBX_NATIVE_TARGET_SECTION, pbxprojPath)
  const configurationListSection = getPbxprojSection(content, XC_CONFIGURATION_LIST_SECTION, pbxprojPath)
  const buildConfigurationSection = getPbxprojSection(content, XC_BUILD_CONFIGURATION_SECTION, pbxprojPath)

  return {
    targets: parseNativeTargets(nativeTargetSection),
    configurationLists: parseConfigurationLists(configurationListSection),
    buildConfigurations: parseBuildConfigurations(buildConfigurationSection),
  }
}

function getPbxprojSection(content: string, sectionName: string, pbxprojPath: string): string {
  const pattern = new RegExp(`/[*] Begin ${sectionName} section [*]/([\\s\\S]*?)/[*] End ${sectionName} section [*]/`)
  const match = content.match(pattern)

  if (!match) {
    throw new IOSProjectDiscoveryError(`Could not parse ${sectionName} section from ${pbxprojPath}`)
  }

  return match[1]
}

function parseNativeTargets(section: string): ParsedPbxNativeTarget[] {
  const targets: ParsedPbxNativeTarget[] = []
  const entryPattern = /([A-Za-z0-9]+) \/\*[^*]+\*\/ = \{([\s\S]*?)\n\t\t\};/g

  for (const match of section.matchAll(entryPattern)) {
    const [, id, body] = match
    const name = matchPbxprojAssignment(body, 'name')
    const productType = matchPbxprojAssignment(body, 'productType')
    const buildConfigurationListId = matchPbxprojReference(body, 'buildConfigurationList')

    if (!name || !productType || !buildConfigurationListId) {
      continue
    }

    targets.push({
      id,
      name: stripPbxprojValue(name),
      productType: stripPbxprojValue(productType),
      buildConfigurationListId,
    })
  }

  return targets
}

function parseConfigurationLists(section: string): Map<string, ParsedXCConfigurationList> {
  const configurationLists = new Map<string, ParsedXCConfigurationList>()
  const entryPattern = /([A-Za-z0-9]+) \/\*[^*]+\*\/ = \{([\s\S]*?)\n\t\t\};/g

  for (const match of section.matchAll(entryPattern)) {
    const [, id, body] = match
    const buildConfigurationIds = matchBuildConfigurationIds(body)

    if (buildConfigurationIds.length === 0) {
      continue
    }

    configurationLists.set(id, {
      id,
      buildConfigurationIds,
      defaultConfigurationName: stripPbxprojValue(matchPbxprojAssignment(body, 'defaultConfigurationName') ?? '' ) || undefined,
    })
  }

  return configurationLists
}

function parseBuildConfigurations(section: string): Map<string, ParsedXCBuildConfiguration> {
  const buildConfigurations = new Map<string, ParsedXCBuildConfiguration>()
  const entryPattern = /([A-Za-z0-9]+) \/\*[^*]+\*\/ = \{([\s\S]*?)\n\t\t\};/g

  for (const match of section.matchAll(entryPattern)) {
    const [, id, body] = match
    const name = matchPbxprojAssignment(body, 'name')
    const buildSettingsBlock = matchBuildSettingsBlock(body)

    if (!name || !buildSettingsBlock) {
      continue
    }

    buildConfigurations.set(id, {
      id,
      name: stripPbxprojValue(name),
      buildSettings: {
        codeSignEntitlements: matchBuildSetting(buildSettingsBlock, 'CODE_SIGN_ENTITLEMENTS'),
        infoPlistFile: matchBuildSetting(buildSettingsBlock, 'INFOPLIST_FILE'),
        productName: matchBuildSetting(buildSettingsBlock, 'PRODUCT_NAME'),
      },
    })
  }

  return buildConfigurations
}

function getMainTargetCandidates(targets: ParsedPbxNativeTarget[]): ParsedPbxNativeTarget[] {
  return targets.filter((target) => target.productType === IOS_APPLICATION_PRODUCT_TYPE)
}

function resolveMainTarget(
  targets: ParsedPbxNativeTarget[],
  configuredMainTargetName: string | undefined,
  pbxprojPath: string
): ParsedPbxNativeTarget {
  if (targets.length === 0) {
    throw new IOSProjectDiscoveryError(`No iOS application targets were found in ${pbxprojPath}`)
  }

  if (configuredMainTargetName) {
    const configuredTarget = targets.find((target) => target.name === configuredMainTargetName)

    if (configuredTarget) {
      return configuredTarget
    }

    throw new IOSProjectDiscoveryError(
      `Configured iOS main target '${configuredMainTargetName}' was not found. Available application targets: ${targets
        .map((target) => target.name)
        .sort()
        .join(', ')}`
    )
  }

  if (targets.length === 1) {
    return targets[0]
  }

  throw new IOSProjectDiscoveryError(
    `Multiple iOS application targets were found: ${targets
      .map((target) => target.name)
      .sort()
      .join(', ')}. Set ios.project.mainTargetName explicitly.`
  )
}

function getTargetBuildConfigurations(
  project: ParsedIOSProject,
  target: ParsedPbxNativeTarget,
  pbxprojPath: string
): ParsedXCBuildConfiguration[] {
  const configurationList = project.configurationLists.get(target.buildConfigurationListId)

  if (!configurationList) {
    throw new IOSProjectDiscoveryError(
      `Build configuration list ${target.buildConfigurationListId} for target '${target.name}' was not found in ${pbxprojPath}`
    )
  }

  const missingConfigurationIds = configurationList.buildConfigurationIds.filter(
    (configurationId) => !project.buildConfigurations.has(configurationId)
  )

  if (missingConfigurationIds.length > 0) {
    throw new IOSProjectDiscoveryError(
      `Build configurations ${missingConfigurationIds.join(', ')} for target '${target.name}' were not found in ${pbxprojPath}`
    )
  }

  const buildConfigurations = configurationList.buildConfigurationIds
    .map((configurationId) => project.buildConfigurations.get(configurationId))
    .filter((configuration): configuration is ParsedXCBuildConfiguration => configuration !== undefined)

  if (buildConfigurations.length === 0) {
    throw new IOSProjectDiscoveryError(`No build configurations were found for target '${target.name}' in ${pbxprojPath}`)
  }

  const defaultConfigurationName = configurationList.defaultConfigurationName

  if (!defaultConfigurationName) {
    return buildConfigurations
  }

  const defaultConfiguration = buildConfigurations.find((configuration) => configuration.name === defaultConfigurationName)

  return defaultConfiguration ? [defaultConfiguration, ...buildConfigurations.filter((configuration) => configuration !== defaultConfiguration)] : buildConfigurations
}

async function resolveInfoPlistPath(
  iosRoot: string,
  config: NormalizedIOSProjectConfig,
  target: ParsedPbxNativeTarget,
  buildConfigurations: ParsedXCBuildConfiguration[]
): Promise<string> {
  const infoPlistPath =
    config.infoPlistPath ??
    resolveConsistentBuildSettingPath(iosRoot, target, buildConfigurations, 'INFOPLIST_FILE', (configuration) => configuration.buildSettings.infoPlistFile)

  if (!infoPlistPath) {
    throw new IOSProjectDiscoveryError(
      `Could not determine Info.plist for target '${target.name}'. Set ios.project.infoPlistPath explicitly.`
    )
  }

  await ensureFile(
    infoPlistPath,
    config.infoPlistPath
      ? `Configured Info.plist does not exist: ${infoPlistPath}`
      : `Discovered Info.plist does not exist: ${infoPlistPath}`
  )

  return infoPlistPath
}

async function resolveEntitlementsPath(
  iosRoot: string,
  config: NormalizedIOSProjectConfig,
  target: ParsedPbxNativeTarget,
  buildConfigurations: ParsedXCBuildConfiguration[]
): Promise<string | undefined> {
  const entitlementsPath =
    config.entitlementsPath ??
    resolveConsistentBuildSettingPath(
      iosRoot,
      target,
      buildConfigurations,
      'CODE_SIGN_ENTITLEMENTS',
      (configuration) => configuration.buildSettings.codeSignEntitlements
    )

  if (!entitlementsPath) {
    return undefined
  }

  await ensureFile(
    entitlementsPath,
    config.entitlementsPath
      ? `Configured entitlements file does not exist: ${entitlementsPath}`
      : `Discovered entitlements file does not exist: ${entitlementsPath}`
  )

  return entitlementsPath
}

function resolveConsistentBuildSettingPath(
  iosRoot: string,
  target: ParsedPbxNativeTarget,
  buildConfigurations: ParsedXCBuildConfiguration[],
  settingName: string,
  getSettingValue: (configuration: ParsedXCBuildConfiguration) => string | undefined
): string | undefined {
  const resolvedPaths = new Map<string, string[]>()

  for (const configuration of buildConfigurations) {
    const settingValue = getSettingValue(configuration)

    if (!settingValue) {
      continue
    }

    const resolvedPath = resolveXcodePathValue(settingValue, iosRoot, target, configuration)
    const configurationNames = resolvedPaths.get(resolvedPath) ?? []
    configurationNames.push(configuration.name)
    resolvedPaths.set(resolvedPath, configurationNames)
  }

  if (resolvedPaths.size === 0) {
    return undefined
  }

  if (resolvedPaths.size > 1) {
    throw new IOSProjectDiscoveryError(
      `Target '${target.name}' resolves ${settingName} to multiple paths: ${[...resolvedPaths.entries()]
        .map(([resolvedPath, configurationNames]) => `${resolvedPath} (${configurationNames.join(', ')})`)
        .join('; ')}. Set ios.project.${settingName === 'INFOPLIST_FILE' ? 'infoPlistPath' : 'entitlementsPath'} explicitly.`
    )
  }

  return [...resolvedPaths.keys()][0]
}

function resolveXcodePathValue(
  value: string,
  iosRoot: string,
  target: ParsedPbxNativeTarget,
  configuration: ParsedXCBuildConfiguration
): string {
  const substitutions = new Map<string, string>([
    ['PROJECT_DIR', iosRoot],
    ['SRCROOT', iosRoot],
    ['TARGET_NAME', target.name],
  ])

  const productName = configuration.buildSettings.productName

  if (productName) {
    substitutions.set('PRODUCT_NAME', substituteXcodeVariables(productName, substitutions))
  }

  const substitutedValue = substituteXcodeVariables(value, substitutions)

  if (/\$\(|\$\{/.test(substitutedValue)) {
    throw new IOSProjectDiscoveryError(
      `Could not resolve Xcode build setting path '${value}' for target '${target.name}'. Set an explicit ios.project override.`
    )
  }

  return path.normalize(path.isAbsolute(substitutedValue) ? substitutedValue : path.join(iosRoot, substitutedValue))
}

function substituteXcodeVariables(value: string, substitutions: Map<string, string>): string {
  let nextValue = stripPbxprojValue(value)

  for (let iteration = 0; iteration < 5; iteration += 1) {
    let didReplace = false

    nextValue = nextValue.replace(/\$\(([^)]+)\)|\$\{([^}]+)\}/g, (match, groupedName, bracedName) => {
      const variableName = groupedName ?? bracedName
      const substitution = substitutions.get(variableName)

      if (substitution === undefined) {
        return match
      }

      didReplace = true
      return substitution
    })

    if (!didReplace) {
      break
    }
  }

  return stripPbxprojValue(nextValue)
}

function matchBuildConfigurationIds(body: string): string[] {
  const match = body.match(/buildConfigurations = \(([\s\S]*?)\n\t\t\t\);/)

  if (!match) {
    return []
  }

  return [...match[1].matchAll(/([A-Za-z0-9]+) \/\*[^*]+\*\//g)].map((configurationMatch) => configurationMatch[1])
}

function matchBuildSettingsBlock(body: string): string | undefined {
  return body.match(/buildSettings = \{([\s\S]*?)\n\t\t\t\};/)?.[1]
}

function matchBuildSetting(buildSettingsBlock: string, settingName: string): string | undefined {
  return stripPbxprojValue(buildSettingsBlock.match(new RegExp(`\\b${settingName}\\s*=\\s*([^;]+);`))?.[1] ?? '') || undefined
}

function matchPbxprojReference(body: string, fieldName: string): string | undefined {
  return body.match(new RegExp(`\\b${fieldName}\\s*=\\s*([A-Za-z0-9]+)`))?.[1]
}

function matchPbxprojAssignment(body: string, fieldName: string): string | undefined {
  return body.match(new RegExp(`\\b${fieldName}\\s*=\\s*([^;]+);`))?.[1]
}

function stripPbxprojValue(value: string): string {
  const trimmedValue = value.trim()

  if (trimmedValue.startsWith('"') && trimmedValue.endsWith('"')) {
    return trimmedValue.slice(1, -1)
  }

  return trimmedValue
}

async function ensureDirectory(dirPath: string, message: string): Promise<void> {
  const stat = await readPathStat(dirPath)

  if (!stat) {
    throw new IOSProjectDiscoveryError(message)
  }

  if (!stat.isDirectory()) {
    throw new IOSProjectDiscoveryError(`Expected a directory but found a file: ${dirPath}`)
  }
}

async function ensureFile(filePath: string, message: string): Promise<void> {
  const stat = await readPathStat(filePath)

  if (!stat) {
    throw new IOSProjectDiscoveryError(message)
  }

  if (!stat.isFile()) {
    throw new IOSProjectDiscoveryError(`Expected a file but found a directory: ${filePath}`)
  }
}

async function readPathStat(targetPath: string): Promise<Stats | undefined> {
  try {
    return await fs.stat(targetPath)
  } catch (error: unknown) {
    if (isNotFoundError(error)) {
      return undefined
    }

    throw error
  }
}

function isNotFoundError(error: unknown): error is NodeJS.ErrnoException {
  return error instanceof Error && 'code' in error && error.code === 'ENOENT'
}
