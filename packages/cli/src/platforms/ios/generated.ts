import fs from 'node:fs'
import fsPromises from 'node:fs/promises'
import path from 'node:path'
import vm from 'node:vm'
import { createRequire } from 'node:module'

import * as babel from '@babel/core'

import { requirePlatformPackage } from '../../dependencies/platformPackages'
import { ensureDirectory, pathExists, readTextFile, writeTextFile } from '../../fs/readWrite'
import { normalizeRelativePath, toRelativePath } from '../../fs/path'
import { VoltraCliError } from '../../reporting/summary'
import { buildPlistXml, parsePlistFile } from './plist'
import { resolveIOSWidgetTargetName } from './targetName'

import type { IOSProjectDiscovery } from '../../discovery/ios'
import type { IOSWidgetFamily, NormalizedIOSWidgetConfig, NormalizedVoltraIOSConfig, WidgetLabel } from '../../config/types'
import type { ReportedChange } from '../../reporting/summary'

const MODULE_EXTENSIONS = ['.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs', '']
const VALID_IMAGE_EXTENSIONS = new Set(['.png', '.jpg', '.jpeg'])
const FONT_EXTENSIONS = new Set(['.ttf', '.otf', '.woff', '.woff2'])
const MAX_IMAGE_SIZE_BYTES = 4096
const DEFAULT_INITIAL_STATE_LOCALE = '__default'
const VOLTRA_WIDGET_STRINGS_BASENAME = 'VoltraWidgets.strings'

const IOS_WIDGET_FAMILY_MAP: Record<IOSWidgetFamily, string> = {
  systemSmall: '.systemSmall',
  systemMedium: '.systemMedium',
  systemLarge: '.systemLarge',
  systemExtraLarge: '.systemExtraLarge',
  accessoryCircular: '.accessoryCircular',
  accessoryRectangular: '.accessoryRectangular',
  accessoryInline: '.accessoryInline',
}

const GENERATED_INITIAL_STATE_LOCALE_HELPER = `private enum VoltraGeneratedInitialStateLocale {
  static func pickJson(from perLocale: [String: String], preferredLanguages: [String]) -> String? {
    let entries = perLocale.filter { !$0.value.isEmpty }
    if entries.isEmpty {
      return nil
    }

    func normalize(_ tag: String) -> String {
      tag.trimmingCharacters(in: .whitespacesAndNewlines)
        .lowercased()
        .replacingOccurrences(of: "_", with: "-")
    }

    var byNorm: [String: String] = [:]
    for (k, v) in entries {
      byNorm[normalize(k)] = v
    }

    for pref in preferredLanguages {
      let n = normalize(pref)
      if let direct = byNorm[n] {
        return direct
      }
      let lang = n.split(separator: "-").first.map(String.init) ?? n
      for (key, val) in entries {
        let kn = normalize(key)
        let keyLang = kn.split(separator: "-").first.map(String.init) ?? kn
        if keyLang == lang {
          return val
        }
      }
    }

    if let en = byNorm["en"] {
      return en
    }
    if let englishFamily = entries.keys.sorted().first(where: {
      let normalized = normalize($0)
      return normalized == "en" || normalized.hasPrefix("en-")
    }) {
      return entries[englishFamily]
    }
    if let def = byNorm["__default"] {
      return def
    }

    let sorted = entries.keys.sorted()
    guard let firstKey = sorted.first else {
      return nil
    }
    return entries[firstKey]
  }

  static func preferredLanguageTags() -> [String] {
    Locale.preferredLanguages
  }
}
`

export interface GenerateIOSFilesOptions {
  projectRoot: string
  ios: NormalizedVoltraIOSConfig
  discovery: IOSProjectDiscovery
}

export interface GenerateIOSFilesResult {
  changes: ReportedChange[]
  files: string[]
  warnings: string[]
  targetName: string
  targetPath: string
}

interface GeneratedFileResult {
  change?: ReportedChange
  relativePath: string
}

interface MainAppMetadata {
  shortVersionString: string
  buildNumber: string
  urlTypes?: Array<{ CFBundleURLSchemes: string[] }>
}

type WidgetVariants = Record<string, unknown>
type IOSWidgetRenderer = (variants: WidgetVariants) => string
interface IOSPlatformPackage {
  renderWidgetToString?: unknown
}
type PrerenderedWidgetStates = Map<string, Map<string, string>>

export class IOSGeneratedFilesError extends VoltraCliError {
  constructor(message: string) {
    super(message, 'VOLTRA_IOS_GENERATED_FILES_FAILED')
    this.name = 'IOSGeneratedFilesError'
  }
}

function createGeneratedFilesError(message: string): IOSGeneratedFilesError {
  return new IOSGeneratedFilesError(message)
}

export async function generateIOSFiles(options: GenerateIOSFilesOptions): Promise<GenerateIOSFilesResult> {
  const { projectRoot, ios, discovery } = options
  const targetName = resolveIOSWidgetTargetName(ios, discovery)
  const targetPath = path.join(discovery.iosRoot, targetName)
  const mainAppMetadata = await readMainAppMetadata(discovery.infoPlistPath)
  const changes: ReportedChange[] = []
  const warnings: string[] = []
  const generatedFiles = new Set<string>()

  const infoPlistResult = await generateInfoPlistFile(projectRoot, targetPath, targetName, ios, mainAppMetadata)
  mergeSingleResult(infoPlistResult, changes, generatedFiles)

  const entitlementsResult = await generateEntitlementsFile(projectRoot, targetPath, targetName, ios)
  mergeSingleResult(entitlementsResult, changes, generatedFiles)

  const assetResult = await generateAssetsCatalog(projectRoot, targetPath, ios.userImagesPath)
  mergeResult(assetResult, changes, warnings, generatedFiles)

  const fontsResult = await copyIOSFonts(projectRoot, targetPath, ios.fonts)
  mergeResult(fontsResult, changes, warnings, generatedFiles)

  const initialStatesResult = await generateInitialStatesSwift(projectRoot, ios.widgets)
  mergeSingleResult(
    await writeGeneratedTextFile(projectRoot, path.join(targetPath, 'VoltraWidgetInitialStates.swift'), initialStatesResult),
    changes,
    generatedFiles
  )

  const widgetBundleResult = await writeGeneratedTextFile(
    projectRoot,
    path.join(targetPath, 'VoltraWidgetBundle.swift'),
    generateWidgetBundleSwift(ios.widgets)
  )
  mergeSingleResult(widgetBundleResult, changes, generatedFiles)

  const localizedStringResults = await generateLocalizedWidgetStrings(projectRoot, targetPath, ios.widgets)
  mergeResult(localizedStringResults, changes, warnings, generatedFiles)

  return {
    changes,
    files: [...generatedFiles].sort(),
    warnings,
    targetName,
    targetPath,
  }
}

async function generateInfoPlistFile(
  projectRoot: string,
  targetPath: string,
  targetName: string,
  ios: NormalizedVoltraIOSConfig,
  mainAppMetadata: MainAppMetadata
): Promise<GeneratedFileResult> {
  const plistPath = path.join(targetPath, 'Info.plist')
  const fontNames = ios.fonts.map((fontPath) => path.basename(fontPath)).sort()
  const serverWidgets = ios.widgets.filter((widget) => widget.serverUpdate)
  const serverUrls = Object.fromEntries(serverWidgets.map((widget) => [widget.id, widget.serverUpdate?.url]))
  const serverIntervals = Object.fromEntries(serverWidgets.map((widget) => [widget.id, widget.serverUpdate?.intervalMinutes]))
  const serverRefresh = Object.fromEntries(serverWidgets.map((widget) => [widget.id, widget.serverUpdate?.refresh ?? false]))
  const infoPlist = buildPlistXml({
    CFBundleDevelopmentRegion: '$(DEVELOPMENT_LANGUAGE)',
    CFBundleDisplayName: targetName,
    CFBundleExecutable: '$(EXECUTABLE_NAME)',
    CFBundleIdentifier: '$(PRODUCT_BUNDLE_IDENTIFIER)',
    CFBundleInfoDictionaryVersion: '6.0',
    CFBundleName: '$(PRODUCT_NAME)',
    CFBundlePackageType: '$(PRODUCT_BUNDLE_PACKAGE_TYPE)',
    CFBundleShortVersionString: mainAppMetadata.shortVersionString,
    CFBundleVersion: mainAppMetadata.buildNumber,
    NSExtension: {
      NSExtensionPointIdentifier: 'com.apple.widgetkit-extension',
    },
    RCTNewArchEnabled: true,
    CFBundleURLTypes: mainAppMetadata.urlTypes,
    UIAppFonts: fontNames.length > 0 ? fontNames : undefined,
    Voltra_AppGroupIdentifier: ios.groupIdentifier,
    Voltra_KeychainGroup: ios.keychainGroup,
    Voltra_WidgetServerIntervals: Object.keys(serverIntervals).length > 0 ? serverIntervals : undefined,
    Voltra_WidgetServerRefresh: Object.keys(serverRefresh).length > 0 ? serverRefresh : undefined,
    NSAppTransportSecurity:
      serverWidgets.length > 0
        ? {
            NSAllowsLocalNetworking: true,
            NSAllowsArbitraryLoads: false,
          }
        : undefined,
    Voltra_WidgetServerUrls: Object.keys(serverUrls).length > 0 ? serverUrls : undefined,
  }, createGeneratedFilesError)

  return writeGeneratedTextFile(projectRoot, plistPath, infoPlist)
}

async function generateEntitlementsFile(
  projectRoot: string,
  targetPath: string,
  targetName: string,
  ios: NormalizedVoltraIOSConfig
): Promise<GeneratedFileResult> {
  const entitlementsPath = path.join(targetPath, `${targetName}.entitlements`)
  const entitlements = buildPlistXml({
    'com.apple.security.application-groups': ios.groupIdentifier ? [ios.groupIdentifier] : undefined,
    'keychain-access-groups': ios.keychainGroup ? [ios.keychainGroup] : undefined,
  }, createGeneratedFilesError)

  return writeGeneratedTextFile(projectRoot, entitlementsPath, entitlements)
}

async function generateAssetsCatalog(
  projectRoot: string,
  targetPath: string,
  userImagesPath: string
): Promise<GenerateIOSFilesResult> {
  const changes: ReportedChange[] = []
  const warnings: string[] = []
  const generatedFiles = new Set<string>()
  const assetsCatalogPath = path.join(targetPath, 'Assets.xcassets')
  const rootContentsResult = await writeGeneratedTextFile(
    projectRoot,
    path.join(assetsCatalogPath, 'Contents.json'),
    `${JSON.stringify({ info: { author: 'xcode', version: 1 } }, null, 2)}\n`
  )
  mergeSingleResult(rootContentsResult, changes, generatedFiles)

  const userImages = await collectUserImages(userImagesPath)
  const seenAssetNames = new Map<string, string>()

  for (const imagePath of userImages) {
    const extension = path.extname(imagePath).toLowerCase()

    if (!VALID_IMAGE_EXTENSIONS.has(extension)) {
      continue
    }

    const relativeAssetPath = path.relative(userImagesPath, imagePath).slice(0, -extension.length)
    const imageName = getAssetName(relativeAssetPath, seenAssetNames)
    const imagesetPath = path.join(assetsCatalogPath, `${imageName}.imageset`)
    const imageFileName = `${imageName}${extension}`
    const imageResult = await copyGeneratedFile(projectRoot, imagePath, path.join(imagesetPath, imageFileName))
    mergeSingleResult(imageResult, changes, generatedFiles)

    const contentsResult = await writeGeneratedTextFile(
      projectRoot,
      path.join(imagesetPath, 'Contents.json'),
      `${JSON.stringify(
        {
          images: [{ filename: imageFileName, idiom: 'universal' }],
          info: { author: 'xcode', version: 1 },
        },
        null,
        2
      )}\n`
    )
    mergeSingleResult(contentsResult, changes, generatedFiles)

    const imageWarning = await getLargeImageWarning(imagePath, imageFileName)
    if (imageWarning) {
      warnings.push(imageWarning)
    }
  }

  return {
    changes,
    files: [...generatedFiles],
    warnings,
    targetName: '',
    targetPath,
  }
}

async function copyIOSFonts(projectRoot: string, targetPath: string, fonts: string[]): Promise<GenerateIOSFilesResult> {
  const changes: ReportedChange[] = []
  const generatedFiles = new Set<string>()
  const warnings: string[] = []
  const fontPaths = await resolveFontPaths(projectRoot, fonts)

  for (const fontPath of fontPaths) {
    const result = await copyGeneratedFile(projectRoot, fontPath, path.join(targetPath, path.basename(fontPath)))
    mergeSingleResult(result, changes, generatedFiles)
  }

  return {
    changes,
    files: [...generatedFiles],
    warnings,
    targetName: '',
    targetPath,
  }
}

async function generateLocalizedWidgetStrings(
  projectRoot: string,
  targetPath: string,
  widgets: NormalizedIOSWidgetConfig[]
): Promise<GenerateIOSFilesResult> {
  const changes: ReportedChange[] = []
  const generatedFiles = new Set<string>()
  const byLocale = collectGalleryStringsByLocale(widgets)

  for (const [locale, entries] of byLocale.entries()) {
    const lprojPath = path.join(targetPath, `${locale}.lproj`)
    const stringsPath = path.join(lprojPath, VOLTRA_WIDGET_STRINGS_BASENAME)
    const stringsContent = formatStringsFile(entries)
    const result = await writeGeneratedTextFile(projectRoot, stringsPath, stringsContent)
    mergeSingleResult(result, changes, generatedFiles)
  }

  return {
    changes,
    files: [...generatedFiles],
    warnings: [],
    targetName: '',
    targetPath,
  }
}

async function readMainAppMetadata(infoPlistPath: string): Promise<MainAppMetadata> {
  const dict = await parsePlistFile(infoPlistPath, 'main app Info.plist', (message: string) => new IOSGeneratedFilesError(message))
  const shortVersionString = readPlistString(dict, 'CFBundleShortVersionString') ?? '1.0.0'
  const buildNumber = readPlistString(dict, 'CFBundleVersion') ?? '1'
  const urlTypes = readUrlTypes(dict)

  return {
    shortVersionString,
    buildNumber,
    urlTypes: urlTypes.length > 0 ? urlTypes : undefined,
  }
}

async function generateInitialStatesSwift(projectRoot: string, widgets: NormalizedIOSWidgetConfig[]): Promise<string> {
  const prerenderableWidgets = widgets.filter((widget) => widget.initialStatePath)

  if (prerenderableWidgets.length === 0) {
    return [
      '//',
      '//  VoltraWidgetInitialStates.swift',
      '//',
      '//  Auto-generated by Voltra.',
      '//  No widget initial states configured.',
      '//',
      '',
      'import Foundation',
      '',
      'public enum VoltraWidgetInitialStates {',
      '  public static func getInitialState(for widgetId: String) -> Data? {',
      '    nil',
      '  }',
      '}',
      '',
    ].join('\n')
  }

  const prerenderedStates = await prerenderWidgetStates(projectRoot, prerenderableWidgets, loadIOSWidgetRenderer(projectRoot))
  const widgetEntries = [...prerenderedStates.entries()]
    .map(([widgetId, localeMap]) => {
      const localeEntries = [...localeMap.entries()]
        .map(([localeKey, json]) => {
          const delimiter = getSwiftRawStringDelimiter(json)
          return `      ${JSON.stringify(localeKey)}: ${delimiter}"${json}"${delimiter}`
        })
        .join(',\n')
      return `    ${JSON.stringify(widgetId)}: [\n${localeEntries}\n    ]`
    })
    .join(',\n')

  return [
    '//',
    '//  VoltraWidgetInitialStates.swift',
    '//',
    '//  Auto-generated by Voltra.',
    '//  Contains pre-rendered initial states for home screen widgets.',
    '//',
    '',
    'import Foundation',
    '',
    GENERATED_INITIAL_STATE_LOCALE_HELPER,
    '',
    'public enum VoltraWidgetInitialStates {',
    '  private static let bundledLocalizedStates: [String: [String: String]] = [',
    widgetEntries,
    '  ]',
    '',
    '  public static func getInitialState(for widgetId: String) -> Data? {',
    '    guard let perLocale = bundledLocalizedStates[widgetId] else { return nil }',
    '    let tags = VoltraGeneratedInitialStateLocale.preferredLanguageTags()',
    '    guard let jsonString = VoltraGeneratedInitialStateLocale.pickJson(from: perLocale, preferredLanguages: tags) else {',
    '      return nil',
    '    }',
    '    return jsonString.data(using: .utf8)',
    '  }',
    '}',
    '',
  ].join('\n')
}

function generateWidgetBundleSwift(widgets: NormalizedIOSWidgetConfig[]): string {
  const needsFoundation = widgets.some((widget) => isWidgetLocalizedMap(widget.displayName) || isWidgetLocalizedMap(widget.description))
  const imports = [needsFoundation ? 'import Foundation' : undefined, 'import SwiftUI', 'import WidgetKit', 'import VoltraWidget']
    .filter((value): value is string => value !== undefined)
    .join('\n')

  if (widgets.length === 0) {
    return [
      '//',
      '//  VoltraWidgetBundle.swift',
      '//',
      '//  Auto-generated by Voltra.',
      '//',
      '',
      imports,
      '',
      '@main',
      'struct VoltraWidgetBundle: WidgetBundle {',
      '  var body: some Widget {',
      '    VoltraWidget()',
      '  }',
      '}',
      '',
    ].join('\n')
  }

  const widgetStructs = widgets.map(generateWidgetStruct).join('\n\n')
  const widgetInstances = widgets.map((widget) => `    VoltraWidget_${widget.id}()`).join('\n')

  return [
    '//',
    '//  VoltraWidgetBundle.swift',
    '//',
    '//  Auto-generated by Voltra.',
    '//',
    '',
    imports,
    '',
    '@main',
    'struct VoltraWidgetBundle: WidgetBundle {',
    '  var body: some Widget {',
    '    VoltraWidget()',
    widgetInstances,
    '  }',
    '}',
    '',
    widgetStructs,
    '',
  ].join('\n')
}

function generateWidgetStruct(widget: NormalizedIOSWidgetConfig): string {
  const familiesSwift = widget.supportedFamilies.map((family) => IOS_WIDGET_FAMILY_MAP[family]).join(', ')
  const displayNameExpr = createSwiftLabelExpression(widget.id, 'displayName', widget.displayName)
  const descriptionExpr = createSwiftLabelExpression(widget.id, 'description', widget.description)

  return [
    `public struct VoltraWidget_${widget.id}: Widget {`,
    `  private let widgetId = ${JSON.stringify(widget.id)}`,
    '',
    '  public init() {}',
    '',
    '  public var body: some WidgetConfiguration {',
    '    StaticConfiguration(',
    `      kind: ${JSON.stringify(`Voltra_Widget_${widget.id}`)},`,
    '      provider: VoltraHomeWidgetProvider(',
    '        widgetId: widgetId,',
    '        initialState: VoltraWidgetInitialStates.getInitialState(for: widgetId)',
    '      )',
    '    ) { entry in',
    '      VoltraHomeWidgetView(entry: entry)',
    '    }',
    `    .configurationDisplayName(${displayNameExpr})`,
    `    .description(${descriptionExpr})`,
    `    .supportedFamilies([${familiesSwift}])`,
    '    .contentMarginsDisabled()',
    '  }',
    '}',
  ].join('\n')
}

function createSwiftLabelExpression(widgetId: string, field: 'displayName' | 'description', label: WidgetLabel): string {
  if (!isWidgetLocalizedMap(label)) {
    return `Text(${JSON.stringify(label)})`
  }

  const key = `voltra_widget_${widgetId}_${field}`
  const defaultEnglish = escapeSwiftString(widgetLabelEnglish(label))

  return `Text(LocalizedStringResource(${JSON.stringify(key)}, defaultValue: String.LocalizationValue(${JSON.stringify(defaultEnglish)}), table: ${JSON.stringify('VoltraWidgets')}))`
}

async function prerenderWidgetStates(
  projectRoot: string,
  widgets: NormalizedIOSWidgetConfig[],
  renderer: IOSWidgetRenderer
): Promise<PrerenderedWidgetStates> {
  const prerenderedStates: PrerenderedWidgetStates = new Map()

  for (const widget of widgets) {
    const initialStatePath = widget.initialStatePath

    if (!initialStatePath) {
      continue
    }

    const perLocalePaths = typeof initialStatePath === 'string' ? { [DEFAULT_INITIAL_STATE_LOCALE]: initialStatePath } : initialStatePath
    const localeStates = new Map<string, string>()

    for (const [localeKey, modulePath] of Object.entries(perLocalePaths)) {
      if (!(await pathExists(modulePath))) {
        throw new IOSGeneratedFilesError(`Initial state file not found for widget '${widget.id}' at ${modulePath}`)
      }

      const widgetVariants = evaluateWidgetModule(projectRoot, modulePath)
      localeStates.set(localeKey, renderer(widgetVariants))
    }

    prerenderedStates.set(widget.id, localeStates)
  }

  return prerenderedStates
}

function evaluateWidgetModule(projectRoot: string, filePath: string): WidgetVariants {
  const projectRequire = createProjectRequire(projectRoot)
  const moduleCache = new Map<string, unknown>()

  const customRequire = (moduleSpecifier: string, currentDir: string): unknown => {
    if (!isLocalModule(moduleSpecifier)) {
      return projectRequire(moduleSpecifier)
    }

    const resolvedModulePath = resolveModulePath(moduleSpecifier, currentDir)

    if (!resolvedModulePath) {
      throw new IOSGeneratedFilesError(`Cannot resolve module '${moduleSpecifier}' from '${currentDir}'`)
    }

    const cachedModule = moduleCache.get(resolvedModulePath)
    if (cachedModule !== undefined) {
      return cachedModule
    }

    const transpiledCode = transpileWidgetModule(projectRoot, resolvedModulePath, projectRequire)
    const moduleDir = path.dirname(resolvedModulePath)
    const moduleRecord = { exports: {} as Record<string, unknown> }
    moduleCache.set(resolvedModulePath, moduleRecord.exports)

    const context = vm.createContext({
      __dirname: moduleDir,
      __filename: resolvedModulePath,
      console,
      exports: moduleRecord.exports,
      module: moduleRecord,
      process,
      require: (specifier: string) => customRequire(specifier, moduleDir),
    })

    const script = new vm.Script(transpiledCode, { filename: resolvedModulePath })
    script.runInContext(context)

    moduleCache.set(resolvedModulePath, moduleRecord.exports)
    return moduleRecord.exports
  }

  const exports = customRequire(filePath, path.dirname(filePath)) as { default?: unknown }
  const widgetVariants = exports.default ?? exports

  if (!widgetVariants || typeof widgetVariants !== 'object') {
    throw new IOSGeneratedFilesError(`Widget file must export widget variants: ${filePath}`)
  }

  return widgetVariants as WidgetVariants
}

function loadIOSWidgetRenderer(projectRoot: string): IOSWidgetRenderer {
  const iosPackage = requirePlatformPackage<IOSPlatformPackage>(projectRoot, 'ios')

  if (typeof iosPackage.renderWidgetToString !== 'function') {
    throw new IOSGeneratedFilesError('Installed @use-voltra/ios package does not export renderWidgetToString.')
  }

  return iosPackage.renderWidgetToString as IOSWidgetRenderer
}

function transpileWidgetModule(projectRoot: string, filePath: string, projectRequire: NodeRequire): string {
  const source = fs.readFileSync(filePath, 'utf8')
  const projectBabelConfigPath = resolveProjectBabelConfig(projectRoot)
  const result = babel.transformSync(source, {
    babelrc: false,
    configFile: projectBabelConfigPath,
    cwd: projectRoot,
    filename: filePath,
    presets: projectBabelConfigPath ? undefined : [resolveFallbackBabelPreset(projectRequire)],
  })

  if (!result?.code) {
    throw new IOSGeneratedFilesError(`Babel transpilation failed for ${filePath}`)
  }

  return result.code
}

function resolveProjectBabelConfig(projectRoot: string): string | undefined {
  const candidates = ['babel.config.js', 'babel.config.cjs', 'babel.config.mjs']

  for (const candidate of candidates) {
    const candidatePath = path.join(projectRoot, candidate)
    if (fs.existsSync(candidatePath)) {
      return candidatePath
    }
  }

  return undefined
}

function resolveFallbackBabelPreset(projectRequire: NodeRequire): string {
  try {
    return projectRequire.resolve('@react-native/babel-preset')
  } catch {
    try {
      return projectRequire.resolve('babel-preset-expo')
    } catch {
      throw new IOSGeneratedFilesError(
        'Could not resolve a Babel preset for iOS initial state generation. Add a project babel.config.js or install @react-native/babel-preset.'
      )
    }
  }
}

function createProjectRequire(projectRoot: string): NodeRequire {
  return createRequire(path.join(projectRoot, 'package.json'))
}

function isLocalModule(moduleSpecifier: string): boolean {
  return moduleSpecifier.startsWith('.') || moduleSpecifier.startsWith('/')
}

function resolveModulePath(moduleSpecifier: string, fromDir: string): string | null {
  const basePath = path.resolve(fromDir, moduleSpecifier)

  for (const extension of MODULE_EXTENSIONS) {
    const candidate = `${basePath}${extension}`
    if (fs.existsSync(candidate) && fs.statSync(candidate).isFile()) {
      return candidate
    }
  }

  if (!fs.existsSync(basePath) || !fs.statSync(basePath).isDirectory()) {
    return null
  }

  for (const extension of MODULE_EXTENSIONS) {
    const indexCandidate = path.join(basePath, `index${extension}`)
    if (fs.existsSync(indexCandidate) && fs.statSync(indexCandidate).isFile()) {
      return indexCandidate
    }
  }

  return null
}

async function resolveFontPaths(projectRoot: string, fonts: string[]): Promise<string[]> {
  const projectRequire = createProjectRequire(projectRoot)
  const resolvedFontPaths = new Set<string>()

  for (const font of fonts) {
    const resolvedFontInput = await resolveFontInput(projectRoot, font, projectRequire)

    if (!resolvedFontInput) {
      throw new IOSGeneratedFilesError(`Could not resolve iOS font path: ${font}`)
    }

    const stat = await fsPromises.stat(resolvedFontInput)
    if (!stat.isDirectory()) {
      if (FONT_EXTENSIONS.has(path.extname(resolvedFontInput).toLowerCase())) {
        resolvedFontPaths.add(resolvedFontInput)
      }
      continue
    }

    for (const entry of await fsPromises.readdir(resolvedFontInput)) {
      const candidatePath = path.join(resolvedFontInput, entry)
      if (FONT_EXTENSIONS.has(path.extname(candidatePath).toLowerCase())) {
        resolvedFontPaths.add(candidatePath)
      }
    }
  }

  return [...resolvedFontPaths].sort()
}

async function resolveFontInput(projectRoot: string, input: string, projectRequire: NodeRequire): Promise<string | null> {
  const resolvedPath = path.isAbsolute(input) ? input : path.resolve(projectRoot, input)
  if (await pathExists(resolvedPath)) {
    return resolvedPath
  }

  try {
    return projectRequire.resolve(input)
  } catch {
    return null
  }
}

async function collectUserImages(userImagesPath: string): Promise<string[]> {
  if (!(await pathExists(userImagesPath))) {
    return []
  }

  const collectedPaths: string[] = []
  await collectPathsRecursively(userImagesPath, collectedPaths)
  return collectedPaths.sort()
}

async function collectPathsRecursively(currentPath: string, collectedPaths: string[]): Promise<void> {
  const stat = await fsPromises.lstat(currentPath)

  if (!stat.isDirectory()) {
    if (!path.basename(currentPath).startsWith('.')) {
      collectedPaths.push(currentPath)
    }
    return
  }

  for (const entry of await fsPromises.readdir(currentPath)) {
    await collectPathsRecursively(path.join(currentPath, entry), collectedPaths)
  }
}

async function copyGeneratedFile(projectRoot: string, sourcePath: string, destinationPath: string): Promise<GeneratedFileResult> {
  await ensureDirectory(path.dirname(destinationPath))
  const sourceContent = await fsPromises.readFile(sourcePath)
  const existingContent = (await pathExists(destinationPath)) ? await fsPromises.readFile(destinationPath) : undefined
  const relativePath = toRelativePath(projectRoot, destinationPath)

  if (existingContent && Buffer.compare(existingContent, sourceContent) === 0) {
    return { relativePath }
  }

  await fsPromises.writeFile(destinationPath, sourceContent)

  return {
    change: {
      kind: existingContent ? 'updated' : 'created',
      path: relativePath,
    },
    relativePath,
  }
}

async function writeGeneratedTextFile(projectRoot: string, destinationPath: string, content: string): Promise<GeneratedFileResult> {
  const existingContent = (await pathExists(destinationPath)) ? await readTextFile(destinationPath) : undefined
  const relativePath = toRelativePath(projectRoot, destinationPath)

  if (existingContent === content) {
    return { relativePath }
  }

  await writeTextFile(destinationPath, content)

  return {
    change: {
      kind: existingContent === undefined ? 'created' : 'updated',
      path: relativePath,
    },
    relativePath,
  }
}

async function getLargeImageWarning(imagePath: string, fileName: string): Promise<string | undefined> {
  const stat = await fsPromises.stat(imagePath)

  if (stat.size < MAX_IMAGE_SIZE_BYTES) {
    return undefined
  }

  return `Image '${fileName}' is ${stat.size} bytes. Large iOS widget images may not display correctly.`
}

function collectGalleryStringsByLocale(widgets: NormalizedIOSWidgetConfig[]): Map<string, Record<string, string>> {
  const byLocale = new Map<string, Record<string, string>>()

  const add = (locale: string, key: string, value: string): void => {
    const bucket = byLocale.get(locale) ?? {}
    bucket[key] = value
    byLocale.set(locale, bucket)
  }

  for (const widget of widgets) {
    if (isWidgetLocalizedMap(widget.displayName)) {
      for (const [locale, value] of Object.entries(widget.displayName)) {
        if (value.trim()) {
          add(locale, `voltra_widget_${widget.id}_displayName`, value)
        }
      }
    }

    if (isWidgetLocalizedMap(widget.description)) {
      for (const [locale, value] of Object.entries(widget.description)) {
        if (value.trim()) {
          add(locale, `voltra_widget_${widget.id}_description`, value)
        }
      }
    }
  }

  return byLocale
}

function formatStringsFile(entries: Record<string, string>): string {
  const sortedKeys = Object.keys(entries).sort()
  const lines = sortedKeys.map((key) => `${JSON.stringify(key)} = ${JSON.stringify(entries[key])};`)
  return `/* Voltra widget gallery strings (auto-generated) */\n${lines.join('\n')}\n`
}

function widgetLabelEnglish(label: WidgetLabel): string {
  if (!isWidgetLocalizedMap(label)) {
    return label
  }

  const englishLabel = label.en
  if (typeof englishLabel === 'string' && englishLabel.trim()) {
    return englishLabel
  }

  for (const [localeKey, value] of Object.entries(label)) {
    if ((localeKey.startsWith('en-') || localeKey.startsWith('en_')) && value.trim()) {
      return value
    }
  }

  return Object.values(label).find((value) => value.trim()) ?? ''
}

function isWidgetLocalizedMap(label: WidgetLabel): label is Record<string, string> {
  return typeof label === 'object' && label !== null && !Array.isArray(label)
}

function sanitizeAssetName(value: string): string {
  let sanitized = value.replace(/[^A-Za-z0-9_-]/g, '-')
  sanitized = sanitized.replace(/-+/g, '-')
  sanitized = sanitized.replace(/^[-_]+|[-_]+$/g, '')
  if (!/^[A-Za-z]/.test(sanitized)) {
    sanitized = `asset-${sanitized}`
  }
  return sanitized
}

function getAssetName(relativeAssetPath: string, seenAssetNames: Map<string, string>): string {
  const assetName = sanitizeAssetName(path.basename(relativeAssetPath))
  const existingPath = seenAssetNames.get(assetName)

  if (existingPath && existingPath !== relativeAssetPath) {
    throw new IOSGeneratedFilesError(
      `iOS widget assets must have unique basenames. Found both '${existingPath}' and '${relativeAssetPath}' resolving to asset '${assetName}'.`
    )
  }

  seenAssetNames.set(assetName, relativeAssetPath)
  return assetName
}

function readPlistString(dict: Record<string, unknown>, key: string): string | undefined {
  const value = dict[key]
  return typeof value === 'string' && value.trim() ? value : undefined
}

function readUrlTypes(dict: Record<string, unknown>): Array<{ CFBundleURLSchemes: string[] }> {
  const urlTypesValue = dict.CFBundleURLTypes

  if (!Array.isArray(urlTypesValue)) {
    return []
  }

  return urlTypesValue
    .map((entry): { CFBundleURLSchemes: string[] } | undefined => {
      if (!entry || typeof entry !== 'object') {
        return undefined
      }

      const schemesValue = (entry as { CFBundleURLSchemes?: unknown }).CFBundleURLSchemes

      if (!Array.isArray(schemesValue)) {
        return undefined
      }

      const schemes = schemesValue.filter((scheme): scheme is string => typeof scheme === 'string' && scheme.trim().length > 0)

      return schemes.length > 0 ? { CFBundleURLSchemes: schemes } : undefined
    })
    .filter((entry): entry is { CFBundleURLSchemes: string[] } => entry !== undefined)
}

function escapeSwiftString(value: string): string {
  return value.replace(/\\/g, '\\\\').replace(/"/g, '\\"').replace(/\n/g, '\\n').replace(/\r/g, '\\r')
}

function getSwiftRawStringDelimiter(value: string): string {
  const matches = value.match(/"#+/g)
  if (!matches) {
    return '#'
  }

  const maxHashes = Math.max(...matches.map((match) => match.length - 1))
  return '#'.repeat(maxHashes + 1)
}

function mergeResult(
  result: Pick<GenerateIOSFilesResult, 'changes' | 'files' | 'warnings'>,
  changes: ReportedChange[],
  warnings: string[],
  generatedFiles: Set<string>
): void {
  changes.push(...result.changes)
  warnings.push(...result.warnings)

  for (const filePath of result.files) {
    generatedFiles.add(normalizeRelativePath(filePath))
  }
}

function mergeSingleResult(result: GeneratedFileResult, changes: ReportedChange[], generatedFiles: Set<string>): void {
  if (result.change) {
    changes.push(result.change)
  }

  generatedFiles.add(normalizeRelativePath(result.relativePath))
}
