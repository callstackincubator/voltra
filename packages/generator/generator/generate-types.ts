#!/usr/bin/env node
import { execSync } from 'node:child_process'
import * as fs from 'node:fs'
import * as path from 'node:path'

import { generateComponentIds } from './generators/component-ids'
import { generateKotlinParameters } from './generators/kotlin-parameters'
import { generateShortNames } from './generators/short-names'
import { generateSwiftParameters } from './generators/swift-parameters'
import { generateTypeScriptJSX } from './generators/typescript-jsx'
import type { ComponentsData } from './types'
import { validateComponentsSchema } from './validate-components'

const ROOT_DIR = path.join(__dirname, '..')
const REPO_ROOT = path.join(ROOT_DIR, '..', '..')

type Logger = Pick<typeof console, 'log' | 'warn' | 'error'>

export type GenerationPaths = {
  rootDir: string
  repoRoot: string
  schemaPath: string
  componentsDataPath: string
  tsIosPropsOutputDir: string
  tsAndroidPropsOutputDir: string
  tsIosPayloadOutputDir: string
  tsCorePayloadOutputDir: string
  tsAndroidPayloadOutputDir: string
  swiftParametersOutputDir: string
  swiftSharedOutputDir: string
  kotlinGeneratedDir: string
  kotlinParametersOutputDir: string
  kotlinPayloadOutputDir: string
}

type FormatScriptRunner = (scriptName: string, stepLabel: string, logger: Logger, paths: GenerationPaths) => void
type WorkspaceFormatScriptRunner = (
  scriptName: string,
  workspace: string,
  stepLabel: string,
  logger: Logger,
  paths: GenerationPaths
) => void

type RunGenerationOptions = {
  paths?: GenerationPaths
  logger?: Logger
  runFormatScript?: FormatScriptRunner
  runWorkspaceFormatScript?: WorkspaceFormatScriptRunner
}

export const createGenerationPaths = (rootDir: string = ROOT_DIR, repoRoot: string = REPO_ROOT): GenerationPaths => {
  const swiftGeneratedDir = path.join(rootDir, '..', 'ios-client', 'ios', 'ui', 'Generated')
  const androidClientNativeRoot = path.join(rootDir, '..', 'android-client', 'android')

  return {
    rootDir,
    repoRoot,
    schemaPath: path.join(rootDir, 'schemas/components.schema.json'),
    componentsDataPath: path.join(rootDir, 'data/components.json'),
    tsIosPropsOutputDir: path.join(rootDir, '..', 'ios', 'src', 'jsx', 'props'),
    tsAndroidPropsOutputDir: path.join(rootDir, '..', 'android', 'src', 'jsx', 'props'),
    tsIosPayloadOutputDir: path.join(rootDir, '..', 'ios', 'src', 'payload'),
    tsCorePayloadOutputDir: path.join(rootDir, '..', 'core', 'src', 'payload'),
    tsAndroidPayloadOutputDir: path.join(rootDir, '..', 'android', 'src', 'payload'),
    swiftParametersOutputDir: path.join(swiftGeneratedDir, 'Parameters'),
    swiftSharedOutputDir: path.join(rootDir, '..', 'ios-client', 'ios', 'shared'),
    kotlinGeneratedDir: path.join(androidClientNativeRoot, 'src/main/java/voltra/generated'),
    kotlinParametersOutputDir: path.join(androidClientNativeRoot, 'src/main/java/voltra/models/parameters'),
    kotlinPayloadOutputDir: path.join(androidClientNativeRoot, 'src/main/java/voltra/payload'),
  }
}

export const ensureDirectoryExists = (dir: string) => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true })
  }
}

export const writeFiles = (outputDir: string, files: Record<string, string>, rootDir: string = ROOT_DIR) => {
  ensureDirectoryExists(outputDir)

  for (const [filename, content] of Object.entries(files)) {
    const filePath = path.join(outputDir, filename)
    ensureDirectoryExists(path.dirname(filePath))
    fs.writeFileSync(filePath, content, 'utf-8')
    console.log(`   ✓ Generated ${path.relative(rootDir, filePath)}`)
  }
}

/** Remove previously generated files so stale platform-specific outputs are not left behind. */
export const cleanGeneratedDirectory = (outputDir: string, shouldRemove: (filename: string) => boolean) => {
  if (!fs.existsSync(outputDir)) {
    return
  }

  for (const entry of fs.readdirSync(outputDir, { withFileTypes: true })) {
    if (!entry.isFile() || !shouldRemove(entry.name)) {
      continue
    }
    fs.rmSync(path.join(outputDir, entry.name))
  }
}

export const cleanTypeScriptPropsDirectory = (outputDir: string) => {
  cleanGeneratedDirectory(outputDir, (filename) => filename === '.generated' || filename.endsWith('.ts'))
}

export const cleanSwiftParametersDirectory = (outputDir: string) => {
  cleanGeneratedDirectory(
    outputDir,
    (filename) =>
      filename === '.generated' || filename === 'ComponentParameters.swift' || filename.endsWith('Parameters.swift')
  )
}

export const cleanKotlinParametersDirectory = (outputDir: string) => {
  cleanGeneratedDirectory(outputDir, (filename) => filename.endsWith('Parameters.kt'))
}

export const runFormatScript = (scriptName: string, stepLabel: string, logger: Logger, paths: GenerationPaths) => {
  logger.log(`Step ${stepLabel}: Running npm run ${scriptName}...`)
  try {
    const result = execSync(`npm run ${scriptName}`, { encoding: 'utf-8', cwd: paths.rootDir })
    if (result.trim()) {
      logger.log(result.trim())
    }
  } catch (error: any) {
    logger.warn(`   Warning: npm run ${scriptName} exited with code ${error.status ?? 'unknown'}`)
    if (error.stdout) logger.log(`   stdout: ${String(error.stdout).trim()}`)
    if (error.stderr) logger.log(`   stderr: ${String(error.stderr).trim()}`)
  }
  logger.log('')
}

export const runWorkspaceFormatScript = (
  scriptName: string,
  workspace: string,
  stepLabel: string,
  logger: Logger,
  paths: GenerationPaths
) => {
  logger.log(`Step ${stepLabel}: Running npm run ${scriptName} --workspace ${workspace}...`)
  try {
    execSync(`npm run ${scriptName} --workspace ${workspace}`, {
      encoding: 'utf-8',
      cwd: paths.repoRoot,
      stdio: 'inherit',
    })
  } catch (error: any) {
    logger.warn(
      `   Warning: npm run ${scriptName} --workspace ${workspace} exited with code ${error.status ?? 'unknown'}`
    )
    if (error.stdout) logger.log(`   stdout: ${String(error.stdout).trim()}`)
    if (error.stderr) logger.log(`   stderr: ${String(error.stderr).trim()}`)
  }
  logger.log('')
}

const fromRoot = (rootDir: string, targetPath: string) => path.relative(rootDir, targetPath) || '.'

export const runGeneration = ({
  paths = createGenerationPaths(),
  logger = console,
  runFormatScript: runFormatScriptImpl = runFormatScript,
  runWorkspaceFormatScript: runWorkspaceFormatScriptImpl = runWorkspaceFormatScript,
}: RunGenerationOptions = {}) => {
  logger.log('🚀 Generating types from schemas...\n')

  logger.log('Step 1: Validating components schema...')
  if (
    !validateComponentsSchema({
      schemaPath: paths.schemaPath,
      dataPath: paths.componentsDataPath,
      logger,
    })
  ) {
    logger.error('\n❌ Generation failed due to components validation errors')
    process.exit(1)
  }
  logger.log('')

  logger.log('Step 2: Loading components data...')
  const componentsContent = fs.readFileSync(paths.componentsDataPath, 'utf-8')
  const componentsData: ComponentsData = JSON.parse(componentsContent)
  const componentsWithParams = componentsData.components.filter((c) => Object.keys(c.parameters).length > 0).length
  logger.log(
    `   ✓ Loaded ${componentsData.components.length} components (${componentsWithParams} with parameters, version ${componentsData.version})`
  )
  logger.log('')

  logger.log('Step 3: Generating TypeScript component props types...')
  const tsIosJsxResult = generateTypeScriptJSX(componentsData, 'ios')
  const tsAndroidJsxResult = generateTypeScriptJSX(componentsData, 'android')
  cleanTypeScriptPropsDirectory(paths.tsIosPropsOutputDir)
  cleanTypeScriptPropsDirectory(paths.tsAndroidPropsOutputDir)
  writeFiles(paths.tsIosPropsOutputDir, tsIosJsxResult.props, paths.rootDir)
  writeFiles(paths.tsAndroidPropsOutputDir, tsAndroidJsxResult.props, paths.rootDir)
  logger.log('')

  logger.log('Step 4: Generating Swift parameter types...')
  cleanSwiftParametersDirectory(paths.swiftParametersOutputDir)
  const swiftParameterFiles = generateSwiftParameters(componentsData)
  writeFiles(paths.swiftParametersOutputDir, swiftParameterFiles, paths.rootDir)
  logger.log('')

  logger.log('Step 5: Generating Kotlin parameter types...')
  cleanKotlinParametersDirectory(paths.kotlinParametersOutputDir)
  const kotlinParameterFiles = generateKotlinParameters(componentsData)
  writeFiles(paths.kotlinParametersOutputDir, kotlinParameterFiles, paths.rootDir)
  logger.log('')

  logger.log('Step 6: Generating component ID mappings...')
  const componentIdFiles = generateComponentIds(componentsData)
  const tsIosComponentIdFiles: Record<string, string> = {}
  const tsAndroidComponentIdFiles: Record<string, string> = {}
  const swiftComponentIdFiles: Record<string, string> = {}
  const kotlinComponentIdFiles: Record<string, string> = {}
  for (const [filename, content] of Object.entries(componentIdFiles)) {
    if (filename === 'component-ids.ts') {
      tsIosComponentIdFiles[filename] = content
    } else if (filename === 'android-component-ids.ts') {
      tsAndroidComponentIdFiles['component-ids.ts'] = content
    } else if (filename.endsWith('.swift')) {
      swiftComponentIdFiles[filename] = content
    } else if (filename.endsWith('.kt')) {
      kotlinComponentIdFiles[filename] = content
    }
  }
  writeFiles(paths.tsIosPayloadOutputDir, tsIosComponentIdFiles, paths.rootDir)
  writeFiles(paths.tsAndroidPayloadOutputDir, tsAndroidComponentIdFiles, paths.rootDir)
  writeFiles(paths.swiftSharedOutputDir, swiftComponentIdFiles, paths.rootDir)
  writeFiles(paths.kotlinPayloadOutputDir, kotlinComponentIdFiles, paths.rootDir)
  logger.log('')

  logger.log('Step 7: Generating unified short names mappings...')
  const shortNameFiles = generateShortNames(componentsData)
  const tsShortNameFiles: Record<string, string> = {}
  const swiftShortNameFiles: Record<string, string> = {}
  const kotlinShortNameFiles: Record<string, string> = {}
  for (const [filename, content] of Object.entries(shortNameFiles)) {
    if (filename.endsWith('.ts')) {
      tsShortNameFiles[filename] = content
    } else if (filename.endsWith('.swift')) {
      swiftShortNameFiles[filename] = content
    } else if (filename.endsWith('.kt')) {
      kotlinShortNameFiles[filename] = content
    }
  }
  writeFiles(paths.tsCorePayloadOutputDir, tsShortNameFiles, paths.rootDir)
  writeFiles(paths.swiftSharedOutputDir, swiftShortNameFiles, paths.rootDir)
  writeFiles(paths.kotlinGeneratedDir, kotlinShortNameFiles, paths.rootDir)
  logger.log('')

  runFormatScriptImpl('format:js:fix', '8', logger, paths)
  runWorkspaceFormatScriptImpl('format:kotlin:fix', '@use-voltra/android-client', '9', logger, paths)
  runWorkspaceFormatScriptImpl('format:swift:fix', '@use-voltra/ios-client', '10', logger, paths)

  logger.log('✅ Generation complete!\n')
  logger.log('Generated files:')
  logger.log(
    `   TypeScript iOS props: ${Object.keys(tsIosJsxResult.props).length} files in ${fromRoot(
      paths.rootDir,
      paths.tsIosPropsOutputDir
    )}/`
  )
  logger.log(
    `   TypeScript Android props: ${Object.keys(tsAndroidJsxResult.props).length} files in ${fromRoot(
      paths.rootDir,
      paths.tsAndroidPropsOutputDir
    )}/`
  )
  logger.log(
    `   Swift parameters: ${Object.keys(swiftParameterFiles).length} files in ${fromRoot(
      paths.rootDir,
      paths.swiftParametersOutputDir
    )}/`
  )
  logger.log(
    `   Kotlin parameters: ${Object.keys(kotlinParameterFiles).length} files in ${fromRoot(
      paths.rootDir,
      paths.kotlinParametersOutputDir
    )}/`
  )
  logger.log(
    `   Component IDs: ${Object.keys(tsIosComponentIdFiles).length} iOS TypeScript, ${
      Object.keys(tsAndroidComponentIdFiles).length
    } Android TypeScript, ${Object.keys(swiftComponentIdFiles).length} Swift, ${
      Object.keys(kotlinComponentIdFiles).length
    } Kotlin`
  )
  logger.log(
    `   Short names: ${Object.keys(tsShortNameFiles).length} TypeScript in ${fromRoot(
      paths.rootDir,
      paths.tsCorePayloadOutputDir
    )}/, ${Object.keys(swiftShortNameFiles).length} Swift, ${Object.keys(kotlinShortNameFiles).length} Kotlin`
  )
  logger.log('')
  logger.log('Next steps:')
  logger.log('   1. Review generated files')
  logger.log(
    `   2. Create component files manually in ${fromRoot(paths.rootDir, paths.tsIosPropsOutputDir)}/ and ${fromRoot(
      paths.rootDir,
      paths.tsAndroidPropsOutputDir
    )}/ using createVoltraComponent`
  )
  logger.log('   3. Run tests to ensure everything works')
}

const main = () => {
  runGeneration()
}

if (require.main === module) {
  try {
    main()
  } catch (error) {
    console.error('❌ Generation failed:', error)
    process.exit(1)
  }
}
