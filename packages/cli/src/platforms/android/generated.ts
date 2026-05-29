import fs from 'node:fs'
import fsPromises from 'node:fs/promises'
import path from 'node:path'
import vm from 'node:vm'
import { createRequire } from 'node:module'

import * as babel from '@babel/core'
import { vdConvert } from 'vd-tool'

import { requirePlatformPackage } from '../../dependencies/platformPackages'
import { ensureDirectory, pathExists, readTextFile, writeTextFile } from '../../fs/readWrite'
import { normalizeRelativePath, toRelativePath } from '../../fs/path'
import { VoltraCliError } from '../../reporting/summary'

import type { AndroidProjectDiscovery } from '../../discovery/android'
import type { NormalizedAndroidWidgetConfig, NormalizedVoltraAndroidConfig, WidgetLabel } from '../../config/types'
import type { ReportedChange } from '../../reporting/summary'

const MODULE_EXTENSIONS = ['.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs', '']
const VALID_DRAWABLE_EXTENSIONS = new Set(['.png', '.jpg', '.jpeg', '.gif', '.webp', '.xml', '.svg'])
const FONT_EXTENSIONS = new Set(['.ttf', '.otf', '.woff', '.woff2'])
const MAX_IMAGE_SIZE_BYTES = 4096
const DEFAULT_INITIAL_STATE_LOCALE = '__default'
const LOCALIZED_INITIAL_STATE_KEY = '__voltraLocales'
const DEFAULT_WIDGET_LOCALE_QUALIFIER = 'en'

export interface GenerateAndroidFilesOptions {
  projectRoot: string
  android: NormalizedVoltraAndroidConfig
  discovery: AndroidProjectDiscovery
}

export interface GenerateAndroidFilesResult {
  changes: ReportedChange[]
  files: string[]
  warnings: string[]
}

interface GeneratedFileResult {
  change?: ReportedChange
  relativePath: string
}

export class AndroidGeneratedFilesError extends VoltraCliError {
  constructor(message: string) {
    super(message, 'VOLTRA_ANDROID_GENERATED_FILES_FAILED')
    this.name = 'AndroidGeneratedFilesError'
  }
}

type AndroidWidgetVariants = Record<string, unknown>
type AndroidWidgetRenderer = (variants: AndroidWidgetVariants) => string
interface AndroidPlatformPackage {
  renderAndroidWidgetToString?: unknown
}

type PrerenderedWidgetStates = Map<string, Map<string, string>>

export async function generateAndroidFiles(options: GenerateAndroidFilesOptions): Promise<GenerateAndroidFilesResult> {
  const { projectRoot, android, discovery } = options
  const resourceRoot = path.join(discovery.appModuleRoot, 'src', 'main')
  const changes: ReportedChange[] = []
  const warnings: string[] = []
  const generatedFiles = new Set<string>()

  const receiverFiles = await generateWidgetReceivers(projectRoot, discovery, android.widgets)
  mergeResult(receiverFiles, changes, warnings, generatedFiles)

  const assetFiles = await generateAndroidAssets(projectRoot, resourceRoot, android)
  mergeResult(assetFiles, changes, warnings, generatedFiles)

  const xmlFiles = await generateAndroidXmlFiles(projectRoot, resourceRoot, android.widgets)
  mergeResult(xmlFiles, changes, warnings, generatedFiles)

  const fontFiles = await copyAndroidFonts(projectRoot, resourceRoot, android.fonts)
  mergeResult(fontFiles, changes, warnings, generatedFiles)

  const initialStateFiles = await generateAndroidInitialStates(projectRoot, resourceRoot, android.widgets)
  mergeResult(initialStateFiles, changes, warnings, generatedFiles)

  return {
    changes,
    files: [...generatedFiles].sort(),
    warnings,
  }
}

async function generateWidgetReceivers(
  projectRoot: string,
  discovery: AndroidProjectDiscovery,
  widgets: NormalizedAndroidWidgetConfig[]
): Promise<GenerateAndroidFilesResult> {
  const javaRoot = path.join(discovery.appModuleRoot, 'src', 'main', 'java')
  const widgetDir = path.join(javaRoot, discovery.packageName.replace(/\./g, '/'), 'widget')
  const changes: ReportedChange[] = []
  const generatedFiles = new Set<string>()

  for (const widget of widgets) {
    assertValidWidgetId(widget.id)
    const receiverPath = path.join(widgetDir, `VoltraWidget_${widget.id}Receiver.kt`)
    const receiverContent = generateWidgetReceiverContent(widget, discovery.packageName)
    const result = await writeGeneratedTextFile(projectRoot, receiverPath, receiverContent)

    pushChange(changes, result.change)
    generatedFiles.add(result.relativePath)
  }

  return {
    changes,
    files: [...generatedFiles],
    warnings: [],
  }
}

async function generateAndroidXmlFiles(
  projectRoot: string,
  resourceRoot: string,
  widgets: NormalizedAndroidWidgetConfig[]
): Promise<GenerateAndroidFilesResult> {
  const changes: ReportedChange[] = []
  const generatedFiles = new Set<string>()
  const warnings: string[] = []
  const xmlDir = path.join(resourceRoot, 'res', 'xml')
  const layoutDir = path.join(resourceRoot, 'res', 'layout')
  const valuesDir = path.join(resourceRoot, 'res', 'values')

  if (widgets.length === 0) {
    return { changes, files: [], warnings }
  }

  const defaultStringsPath = path.join(valuesDir, 'voltra_widgets.xml')
  const defaultStringsResult = await writeGeneratedTextFile(projectRoot, defaultStringsPath, generateWidgetStringsXml(widgets, null))
  pushChange(changes, defaultStringsResult.change)
  generatedFiles.add(defaultStringsResult.relativePath)

  for (const localeKey of collectWidgetLocaleKeys(widgets)) {
    const qualifier = localeKeyToAndroidValuesQualifier(localeKey)

    if (qualifier === DEFAULT_WIDGET_LOCALE_QUALIFIER) {
      continue
    }

    const localizedValuesPath = path.join(resourceRoot, 'res', `values-${qualifier}`, 'voltra_widgets.xml')
    const localizedValuesResult = await writeGeneratedTextFile(projectRoot, localizedValuesPath, generateWidgetStringsXml(widgets, localeKey))
    pushChange(changes, localizedValuesResult.change)
    generatedFiles.add(localizedValuesResult.relativePath)
  }

  const placeholderLayoutPath = path.join(layoutDir, 'voltra_widget_placeholder.xml')
  const placeholderLayoutResult = await writeGeneratedTextFile(projectRoot, placeholderLayoutPath, generatePlaceholderLayoutXml())
  pushChange(changes, placeholderLayoutResult.change)
  generatedFiles.add(placeholderLayoutResult.relativePath)

  const previewLayoutMap = await generatePreviewLayouts(projectRoot, layoutDir, widgets, warnings, changes, generatedFiles)

  for (const widget of widgets) {
    const widgetInfoPath = path.join(xmlDir, `voltra_widget_${widget.id}_info.xml`)
    const widgetInfoContent = generateWidgetInfoXml(
      widget,
      widget.previewImage ? getPreviewImageResourceName(widget) : undefined,
      previewLayoutMap.get(widget.id)
    )
    const widgetInfoResult = await writeGeneratedTextFile(projectRoot, widgetInfoPath, widgetInfoContent)
    pushChange(changes, widgetInfoResult.change)
    generatedFiles.add(widgetInfoResult.relativePath)
  }

  return {
    changes,
    files: [...generatedFiles],
    warnings,
  }
}

async function generatePreviewLayouts(
  projectRoot: string,
  layoutDir: string,
  widgets: NormalizedAndroidWidgetConfig[],
  warnings: string[],
  changes: ReportedChange[],
  generatedFiles: Set<string>
): Promise<Map<string, string>> {
  const previewLayoutMap = new Map<string, string>()

  for (const widget of widgets) {
    const layoutResourceName = `voltra_widget_${widget.id}_preview`
    const layoutFilePath = path.join(layoutDir, `${layoutResourceName}.xml`)

    if (widget.previewLayout) {
      const sourceExists = await pathExists(widget.previewLayout)

      if (!sourceExists) {
        throw new AndroidGeneratedFilesError(`Preview layout not found for widget '${widget.id}' at ${widget.previewLayout}`)
      }

      const content = await readTextFile(widget.previewLayout)
      const layoutResult = await writeGeneratedTextFile(projectRoot, layoutFilePath, content)
      pushChange(changes, layoutResult.change)
      generatedFiles.add(layoutResult.relativePath)
      previewLayoutMap.set(widget.id, layoutResourceName)
      continue
    }

    if (!widget.previewImage) {
      continue
    }

    const content = generateAutoImagePreviewLayout(widget.id, getPreviewImageResourceName(widget))
    const layoutResult = await writeGeneratedTextFile(projectRoot, layoutFilePath, content)
    pushChange(changes, layoutResult.change)
    generatedFiles.add(layoutResult.relativePath)
    previewLayoutMap.set(widget.id, layoutResourceName)

    const previewImageSizeWarning = await getLargeImageWarning(widget.previewImage, path.basename(widget.previewImage))
    if (previewImageSizeWarning) {
      warnings.push(previewImageSizeWarning)
    }
  }

  return previewLayoutMap
}

async function generateAndroidAssets(
  projectRoot: string,
  resourceRoot: string,
  android: NormalizedVoltraAndroidConfig
): Promise<GenerateAndroidFilesResult> {
  const drawableDir = path.join(resourceRoot, 'res', 'drawable')
  const changes: ReportedChange[] = []
  const warnings: string[] = []
  const generatedFiles = new Set<string>()

  for (const assetPath of await collectUserAssetPaths(projectRoot, android.userImagesPath)) {
    const extension = path.extname(assetPath).toLowerCase()

    if (!VALID_DRAWABLE_EXTENSIONS.has(extension)) {
      throw new AndroidGeneratedFilesError(
        `Unsupported Android drawable asset '${assetPath}'. Supported extensions: ${[...VALID_DRAWABLE_EXTENSIONS].sort().join(', ')}`
      )
    }

    const resourceName = sanitizeDrawableName(path.relative(android.userImagesPath, assetPath))

    if (extension === '.svg') {
      const destinationPath = path.join(drawableDir, `${resourceName}.svg`)
      const svgResult = await convertSvgToVectorDrawable(projectRoot, assetPath, destinationPath)

      pushChange(changes, svgResult.change)
      generatedFiles.add(svgResult.relativePath)
      continue
    }

    const destinationPath = path.join(drawableDir, `${resourceName}${extension}`)
    const imageWarning = extension === '.xml' ? undefined : await getLargeImageWarning(assetPath, path.basename(assetPath))

    if (imageWarning) {
      warnings.push(imageWarning)
    }

    const assetResult = await copyGeneratedFile(projectRoot, assetPath, destinationPath)
    pushChange(changes, assetResult.change)
    generatedFiles.add(assetResult.relativePath)
  }

  for (const widget of android.widgets) {
    if (!widget.previewImage) {
      continue
    }

    if (!(await pathExists(widget.previewImage))) {
      throw new AndroidGeneratedFilesError(`Preview image not found for widget '${widget.id}' at ${widget.previewImage}`)
    }

    const extension = path.extname(widget.previewImage).toLowerCase()

    if (!VALID_DRAWABLE_EXTENSIONS.has(extension)) {
      throw new AndroidGeneratedFilesError(
        `Unsupported Android preview image '${widget.previewImage}' for widget '${widget.id}'. Supported extensions: ${[
          ...VALID_DRAWABLE_EXTENSIONS,
        ]
          .sort()
          .join(', ')}`
      )
    }

    const resourceName = getPreviewImageResourceName(widget)
    if (extension === '.svg') {
      const destinationPath = path.join(drawableDir, `${resourceName}.svg`)
      const previewResult = await convertSvgToVectorDrawable(projectRoot, widget.previewImage, destinationPath)

      pushChange(changes, previewResult.change)
      generatedFiles.add(previewResult.relativePath)
      continue
    }

    const destinationPath = path.join(drawableDir, `${resourceName}${extension}`)
    const imageWarning = extension === '.xml' ? undefined : await getLargeImageWarning(widget.previewImage, path.basename(widget.previewImage))

    if (imageWarning) {
      warnings.push(imageWarning)
    }

    const previewResult = await copyGeneratedFile(projectRoot, widget.previewImage, destinationPath)
    pushChange(changes, previewResult.change)
    generatedFiles.add(previewResult.relativePath)
  }

  return {
    changes,
    files: [...generatedFiles],
    warnings,
  }
}

async function copyAndroidFonts(projectRoot: string, resourceRoot: string, fonts: string[]): Promise<GenerateAndroidFilesResult> {
  const changes: ReportedChange[] = []
  const generatedFiles = new Set<string>()
  const warnings: string[] = []

  if (fonts.length === 0) {
    return { changes, files: [], warnings }
  }

  const fontsDir = path.join(resourceRoot, 'assets', 'fonts')
  const fontPaths = await resolveFontPaths(projectRoot, fonts)

  for (const fontPath of fontPaths) {
    const destinationPath = path.join(fontsDir, path.basename(fontPath))
    const fontResult = await copyGeneratedFile(projectRoot, fontPath, destinationPath)

    pushChange(changes, fontResult.change)
    generatedFiles.add(fontResult.relativePath)
  }

  return {
    changes,
    files: [...generatedFiles],
    warnings,
  }
}

async function generateAndroidInitialStates(
  projectRoot: string,
  resourceRoot: string,
  widgets: NormalizedAndroidWidgetConfig[]
): Promise<GenerateAndroidFilesResult> {
  const prerenderableWidgets = widgets.filter((widget) => widget.initialStatePath)

  if (prerenderableWidgets.length === 0) {
    return {
      changes: [],
      files: [],
      warnings: [],
    }
  }
  const prerenderedStates = await prerenderWidgetStates(projectRoot, prerenderableWidgets, loadAndroidWidgetRenderer(projectRoot))

  if (prerenderedStates.size === 0) {
    return {
      changes: [],
      files: [],
      warnings: [],
    }
  }

  const initialStatesPath = path.join(resourceRoot, 'assets', 'voltra_initial_states.json')
  const initialStatesContent = JSON.stringify(convertPrerenderedStatesToObject(prerenderedStates), null, 2)
  const result = await writeGeneratedTextFile(projectRoot, initialStatesPath, `${initialStatesContent}\n`)

  return {
    changes: result.change ? [result.change] : [],
    files: [result.relativePath],
    warnings: [],
  }
}

async function prerenderWidgetStates(
  projectRoot: string,
  widgets: NormalizedAndroidWidgetConfig[],
  renderer: AndroidWidgetRenderer
): Promise<PrerenderedWidgetStates> {
  const prerenderedStates: PrerenderedWidgetStates = new Map()

  for (const widget of widgets) {
    const initialStatePath = widget.initialStatePath

    if (!initialStatePath) {
      continue
    }

    const perLocalePaths =
      typeof initialStatePath === 'string'
        ? { [DEFAULT_INITIAL_STATE_LOCALE]: initialStatePath }
        : Object.fromEntries(Object.entries(initialStatePath))

    const localeStates = new Map<string, string>()

    for (const [localeKey, modulePath] of Object.entries(perLocalePaths)) {
      if (!(await pathExists(modulePath))) {
        throw new AndroidGeneratedFilesError(`Initial state file not found for widget '${widget.id}' at ${modulePath}`)
      }

      const widgetVariants = evaluateWidgetModule(projectRoot, modulePath)
      localeStates.set(localeKey, renderer(widgetVariants))
    }

    prerenderedStates.set(widget.id, localeStates)
  }

  return prerenderedStates
}

function evaluateWidgetModule(projectRoot: string, filePath: string): AndroidWidgetVariants {
  const projectRequire = createProjectRequire(projectRoot)
  const moduleCache = new Map<string, unknown>()

  const customRequire = (moduleSpecifier: string, currentDir: string): unknown => {
    if (!isLocalModule(moduleSpecifier)) {
      return projectRequire(moduleSpecifier)
    }

    const resolvedModulePath = resolveModulePath(moduleSpecifier, currentDir)

    if (!resolvedModulePath) {
      throw new AndroidGeneratedFilesError(`Cannot resolve module '${moduleSpecifier}' from '${currentDir}'`)
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
    throw new AndroidGeneratedFilesError(`Widget file must export widget variants: ${filePath}`)
  }

  return widgetVariants as AndroidWidgetVariants
}

function loadAndroidWidgetRenderer(projectRoot: string): AndroidWidgetRenderer {
  const androidPackage = requirePlatformPackage<AndroidPlatformPackage>(projectRoot, 'android')

  if (typeof androidPackage.renderAndroidWidgetToString !== 'function') {
    throw new AndroidGeneratedFilesError('Installed @use-voltra/android package does not export renderAndroidWidgetToString.')
  }

  return androidPackage.renderAndroidWidgetToString as AndroidWidgetRenderer
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
    throw new AndroidGeneratedFilesError(`Babel transpilation failed for ${filePath}`)
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
      throw new AndroidGeneratedFilesError(
        'Could not resolve a Babel preset for Android initial state generation. Add a project babel.config.js or install @react-native/babel-preset.'
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

function convertPrerenderedStatesToObject(prerenderedStates: PrerenderedWidgetStates): Record<string, unknown> {
  const result: Record<string, unknown> = {}

  for (const [widgetId, localeStates] of prerenderedStates.entries()) {
    if (localeStates.size === 1 && localeStates.has(DEFAULT_INITIAL_STATE_LOCALE)) {
      result[widgetId] = JSON.parse(localeStates.get(DEFAULT_INITIAL_STATE_LOCALE) ?? 'null')
      continue
    }

    const localizedStates: Record<string, unknown> = {}

    for (const [localeKey, state] of localeStates.entries()) {
      localizedStates[localeKey] = JSON.parse(state)
    }

    result[widgetId] = {
      [LOCALIZED_INITIAL_STATE_KEY]: localizedStates,
    }
  }

  return result
}

async function resolveFontPaths(projectRoot: string, fonts: string[]): Promise<string[]> {
  const projectRequire = createProjectRequire(projectRoot)
  const resolvedFontPaths = new Set<string>()

  for (const font of fonts) {
    const resolvedFontInput = await resolveFontInput(projectRoot, font, projectRequire)

    if (!resolvedFontInput) {
      throw new AndroidGeneratedFilesError(`Could not resolve Android font path: ${font}`)
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

async function collectUserAssetPaths(projectRoot: string, userImagesPath: string): Promise<string[]> {
  const resolvedUserImagesPath = path.isAbsolute(userImagesPath) ? userImagesPath : path.resolve(projectRoot, userImagesPath)

  if (!(await pathExists(resolvedUserImagesPath))) {
    return []
  }

  const collectedPaths: string[] = []

  await collectPathsRecursively(resolvedUserImagesPath, collectedPaths)
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

async function convertSvgToVectorDrawable(projectRoot: string, sourcePath: string, destinationSvgPath: string): Promise<GeneratedFileResult> {
  await ensureDirectory(path.dirname(destinationSvgPath))
  const sourceContent = await fsPromises.readFile(sourcePath)
  const existingSvgContent = (await pathExists(destinationSvgPath)) ? await fsPromises.readFile(destinationSvgPath) : undefined
  const vectorDrawablePath = destinationSvgPath.replace(/\.svg$/i, '.xml')
  const existingVectorDrawableContent = (await pathExists(vectorDrawablePath)) ? await fsPromises.readFile(vectorDrawablePath) : undefined

  try {
    await fsPromises.writeFile(destinationSvgPath, sourceContent)
    await vdConvert(destinationSvgPath)
  } catch (error: unknown) {
    if (existingSvgContent) {
      await fsPromises.writeFile(destinationSvgPath, existingSvgContent)
    } else {
      await fsPromises.rm(destinationSvgPath, { force: true })
    }

    if (existingVectorDrawableContent) {
      await fsPromises.writeFile(vectorDrawablePath, existingVectorDrawableContent)
    } else {
      await fsPromises.rm(vectorDrawablePath, { force: true })
    }

    throw new AndroidGeneratedFilesError(
      `Failed to convert SVG asset ${sourcePath}: ${error instanceof Error ? error.message : String(error)}`
    )
  }

  await fsPromises.rm(destinationSvgPath, { force: true })
  const nextVectorDrawableContent = await fsPromises.readFile(vectorDrawablePath)

  return {
    change:
      existingVectorDrawableContent && Buffer.compare(existingVectorDrawableContent, nextVectorDrawableContent) === 0
        ? undefined
        : {
            kind: existingVectorDrawableContent ? 'updated' : 'created',
            path: toRelativePath(projectRoot, vectorDrawablePath),
          },
    relativePath: toRelativePath(projectRoot, vectorDrawablePath),
  }
}

async function copyGeneratedFile(projectRoot: string, sourcePath: string, destinationPath: string): Promise<GeneratedFileResult> {
  await ensureDirectory(path.dirname(destinationPath))
  const sourceContent = await fsPromises.readFile(sourcePath)
  const existingContent = (await pathExists(destinationPath)) ? await fsPromises.readFile(destinationPath) : undefined
  const relativePath = toRelativePath(projectRoot, destinationPath)

  if (existingContent && Buffer.compare(existingContent, sourceContent) === 0) {
    return {
      relativePath,
    }
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
    return {
      relativePath,
    }
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

  return `Image '${fileName}' is ${stat.size} bytes. Large Android widget images may not display correctly.`
}

function generateWidgetReceiverContent(widget: NormalizedAndroidWidgetConfig, packageName: string): string {
  const className = `VoltraWidget_${widget.id}Receiver`
  const labelForComment = widgetLabelEnglish(widget.displayName)

  if (widget.serverUpdate) {
    const refreshEnabled = widget.serverUpdate.refresh === true

    return [
      `package ${packageName}.widget`,
      '',
      'import android.appwidget.AppWidgetManager',
      'import android.content.Context',
      'import voltra.widget.VoltraWidgetReceiver',
      'import voltra.widget.VoltraWidgetUpdateScheduler',
      '',
      '/**',
      ` * Auto-generated widget receiver for ${labelForComment}`,
      ` * Widget ID: ${widget.id}`,
      ` * Server Update: ${widget.serverUpdate.url} (every ${widget.serverUpdate.intervalMinutes} minutes)`,
      ` * Refresh Button: ${String(refreshEnabled)}`,
      ' */',
      `class ${className} : VoltraWidgetReceiver() {`,
      `    override val widgetId: String = "${widget.id}"`,
      '',
      '    override fun onUpdate(context: Context, appWidgetManager: AppWidgetManager, appWidgetIds: IntArray) {',
      '        super.onUpdate(context, appWidgetManager, appWidgetIds)',
      '',
      '        VoltraWidgetUpdateScheduler.schedulePeriodicUpdate(',
      '            context = context,',
      `            widgetId = "${widget.id}",`,
      `            serverUrl = "${widget.serverUpdate.url}",`,
      `            intervalMinutes = ${widget.serverUpdate.intervalMinutes}L,`,
      `            refreshEnabled = ${String(refreshEnabled)}`,
      '        )',
      '    }',
      '',
      '    override fun onDeleted(context: Context, appWidgetIds: IntArray) {',
      '        super.onDeleted(context, appWidgetIds)',
      '',
      '        val remaining = appWidgetManager(context, appWidgetIds)',
      '        if (remaining == 0) {',
      `            VoltraWidgetUpdateScheduler.cancelPeriodicUpdate(context, "${widget.id}")`,
      '        }',
      '    }',
      '',
      '    private fun appWidgetManager(context: Context, deletedIds: IntArray): Int {',
      '        val manager = AppWidgetManager.getInstance(context)',
      '        val componentName = android.content.ComponentName(context, this::class.java)',
      '        val allIds = manager.getAppWidgetIds(componentName)',
      '        return allIds.count { it !in deletedIds }',
      '    }',
      '}',
      '',
    ].join('\n')
  }

  return [
    `package ${packageName}.widget`,
    '',
    'import voltra.widget.VoltraWidgetReceiver',
    '',
    '/**',
    ` * Auto-generated widget receiver for ${labelForComment}`,
    ` * Widget ID: ${widget.id}`,
    ' */',
    `class ${className} : VoltraWidgetReceiver() {`,
    `    override val widgetId: String = "${widget.id}"`,
    '}',
    '',
  ].join('\n')
}

function generateWidgetInfoXml(
  widget: NormalizedAndroidWidgetConfig,
  previewImageResourceName?: string,
  previewLayoutResourceName?: string
): string {
  const minWidth = widget.minWidth ?? (widget.minCellWidth !== undefined ? widget.minCellWidth * 70 - 30 : undefined)
  const minHeight = widget.minHeight ?? (widget.minCellHeight !== undefined ? widget.minCellHeight * 70 - 30 : undefined)
  const resizeMode = widget.resizeMode ?? 'horizontal|vertical'
  const widgetCategory = widget.widgetCategory ?? 'home_screen'
  const lines = [
    '<?xml version="1.0" encoding="utf-8"?>',
    `<appwidget-provider xmlns:android="http://schemas.android.com/apk/res/android"${minWidth !== undefined ? ` android:minWidth="${minWidth}dp"` : ''}${minHeight !== undefined ? ` android:minHeight="${minHeight}dp"` : ''}`,
    `    android:targetCellWidth="${widget.targetCellWidth}"`,
    `    android:targetCellHeight="${widget.targetCellHeight}"`,
    '    android:updatePeriodMillis="0"',
    '    android:initialLayout="@layout/voltra_widget_placeholder"',
    `    android:resizeMode="${resizeMode}"`,
    `    android:widgetCategory="${widgetCategory}"`,
    `    android:description="@string/voltra_widget_${widget.id}_description"${previewImageResourceName ? ` android:previewImage="@drawable/${previewImageResourceName}"` : ''}${previewLayoutResourceName ? ` android:previewLayout="@layout/${previewLayoutResourceName}"` : ''}>`,
    '</appwidget-provider>',
    '',
  ]

  return lines.join('\n')
}

function generatePlaceholderLayoutXml(): string {
  return [
    '<?xml version="1.0" encoding="utf-8"?>',
    '<FrameLayout xmlns:android="http://schemas.android.com/apk/res/android"',
    '    android:layout_width="match_parent"',
    '    android:layout_height="match_parent"',
    '    android:background="?android:attr/colorBackground">',
    '    <ProgressBar',
    '        style="?android:attr/progressBarStyle"',
    '        android:layout_width="wrap_content"',
    '        android:layout_height="wrap_content"',
    '        android:layout_gravity="center"',
    '        android:indeterminate="true" />',
    '</FrameLayout>',
    '',
  ].join('\n')
}

function generateAutoImagePreviewLayout(widgetId: string, drawableResourceName: string): string {
  return [
    '<?xml version="1.0" encoding="utf-8"?>',
    '<FrameLayout xmlns:android="http://schemas.android.com/apk/res/android"',
    '    android:layout_width="match_parent"',
    '    android:layout_height="match_parent">',
    '    <ImageView',
    '        android:layout_width="match_parent"',
    '        android:layout_height="match_parent"',
    `        android:src="@drawable/${drawableResourceName}"`,
    '        android:scaleType="centerCrop"',
    `        android:contentDescription="@string/voltra_widget_${widgetId}_description" />`,
    '</FrameLayout>',
    '',
  ].join('\n')
}

function generateWidgetStringsXml(widgets: NormalizedAndroidWidgetConfig[], localeKey: string | null): string {
  const localeComment =
    localeKey === null ? 'default (values/)' : `locale ${localeKey} → values-${localeKeyToAndroidValuesQualifier(localeKey)}`
  const entries = widgets
    .map((widget) => {
      const label = escapeAndroidString(resolveWidgetLabel(widget.displayName, localeKey))
      const description = escapeAndroidString(resolveWidgetLabel(widget.description, localeKey))
      return `    <string name="voltra_widget_${widget.id}_label">${label}</string>\n    <string name="voltra_widget_${widget.id}_description">${description}</string>`
    })
    .join('\n')

  return ['<?xml version="1.0" encoding="utf-8"?>', '<resources>', `    <!-- Voltra widget picker strings (auto-generated). ${localeComment} -->`, entries, '</resources>', ''].join('\n')
}

function collectWidgetLocaleKeys(widgets: NormalizedAndroidWidgetConfig[]): Set<string> {
  const localeKeys = new Set<string>()

  for (const widget of widgets) {
    for (const value of [widget.displayName, widget.description]) {
      if (isWidgetLocalizedMap(value)) {
        for (const [localeKey, text] of Object.entries(value)) {
          if (text.trim()) {
            localeKeys.add(localeKey)
          }
        }
      }
    }
  }

  return localeKeys
}

function resolveWidgetLabel(label: WidgetLabel, localeKey: string | null): string {
  if (!isWidgetLocalizedMap(label)) {
    return label
  }

  if (localeKey !== null) {
    const localizedValue = label[localeKey]

    if (typeof localizedValue === 'string' && localizedValue.trim()) {
      return localizedValue
    }
  }

  return widgetLabelEnglish(label)
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

function localeKeyToAndroidValuesQualifier(localeKey: string): string {
  const normalized = localeKey.trim().replace(/_/g, '-')
  const segments = normalized.split('-').filter(Boolean)
  const language = segments[0]?.toLowerCase()

  if (!language) {
    return normalized.toLowerCase()
  }

  const rest = segments.slice(1)

  if (rest.length === 0) {
    return language
  }

  const [first, ...tail] = rest

  if (first && isRegionSubtag(first) && tail.length === 0) {
    return `${language}-r${first.toUpperCase()}`
  }

  const bcp47Segments = [language]

  for (const segment of rest) {
    if (isScriptSubtag(segment)) {
      bcp47Segments.push(formatScriptSubtag(segment))
      continue
    }

    if (isRegionSubtag(segment)) {
      bcp47Segments.push(segment.toUpperCase())
      continue
    }

    bcp47Segments.push(segment.toLowerCase())
  }

  return `b+${bcp47Segments.join('+')}`
}

function escapeAndroidString(value: string): string {
  return value
    .replace(/\\/g, '\\\\')
    .replace(/"/g, '\\"')
    .replace(/'/g, "\\'")
    .replace(/\n/g, '\\n')
    .replace(/\r/g, '\\r')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
}

function sanitizeDrawableName(filePath: string): string {
  const directoryName = path.dirname(filePath)
  const fileName = path.parse(filePath).name
  const nameParts: string[] = []

  if (directoryName !== '.') {
    nameParts.push(
      ...directoryName
        .split(path.sep)
        .filter((segment) => segment !== '.' && segment !== 'assets' && segment !== 'voltra' && segment !== 'voltra-android')
    )
  }

  nameParts.push(fileName)

  let sanitizedName = nameParts.join('_').toLowerCase().replace(/[^a-z0-9_]/g, '_')

  if (!/^[a-z]/.test(sanitizedName)) {
    sanitizedName = `img_${sanitizedName}`
  }

  return sanitizedName
}

function getPreviewImageResourceName(widget: Pick<NormalizedAndroidWidgetConfig, 'id'>): string {
  return `voltra_widget_${widget.id}_preview`
}

function assertValidWidgetId(widgetId: string): void {
  if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(widgetId)) {
    throw new AndroidGeneratedFilesError(
      `Widget ID '${widgetId}' is invalid. Must start with a letter or underscore and contain only alphanumeric characters and underscores.`
    )
  }
}

function isScriptSubtag(value: string): boolean {
  return value.length === 4 && /^[a-z]+$/i.test(value)
}

function isRegionSubtag(value: string): boolean {
  return (value.length === 2 && /^[a-z]+$/i.test(value)) || (value.length === 3 && /^\d+$/.test(value))
}

function formatScriptSubtag(value: string): string {
  const lower = value.toLowerCase()
  return `${lower[0]?.toUpperCase() ?? ''}${lower.slice(1)}`
}

function mergeResult(
  result: GenerateAndroidFilesResult,
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

function pushChange(changes: ReportedChange[], change: ReportedChange | undefined): void {
  if (change) {
    changes.push(change)
  }
}
