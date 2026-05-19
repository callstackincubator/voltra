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
const COMPONENTS_DATA_PATH = path.join(ROOT_DIR, 'data/components.json')
const TS_IOS_PROPS_OUTPUT_DIR = path.join(ROOT_DIR, '..', 'ios', 'src', 'jsx', 'props')
const TS_ANDROID_PROPS_OUTPUT_DIR = path.join(ROOT_DIR, '..', 'android', 'src', 'jsx', 'props')
const TS_IOS_PAYLOAD_OUTPUT_DIR = path.join(ROOT_DIR, '..', 'ios', 'src', 'payload')
const TS_CORE_PAYLOAD_OUTPUT_DIR = path.join(ROOT_DIR, '..', 'core', 'src', 'payload')
const TS_ANDROID_PAYLOAD_OUTPUT_DIR = path.join(ROOT_DIR, '..', 'android', 'src', 'payload')
const SWIFT_GENERATED_DIR = path.join(ROOT_DIR, '..', 'ios-client', 'ios', 'ui', 'Generated')
const SWIFT_PARAMETERS_OUTPUT_DIR = path.join(SWIFT_GENERATED_DIR, 'Parameters')
const SWIFT_SHARED_OUTPUT_DIR = path.join(ROOT_DIR, '..', 'ios-client', 'ios', 'shared')
const ANDROID_CLIENT_NATIVE_ROOT = path.join(ROOT_DIR, '..', 'android-client', 'android')
const KOTLIN_GENERATED_DIR = path.join(ANDROID_CLIENT_NATIVE_ROOT, 'src/main/java/voltra/generated')
const KOTLIN_PARAMETERS_OUTPUT_DIR = path.join(ANDROID_CLIENT_NATIVE_ROOT, 'src/main/java/voltra/models/parameters')
const KOTLIN_PAYLOAD_OUTPUT_DIR = path.join(ANDROID_CLIENT_NATIVE_ROOT, 'src/main/java/voltra/payload')

const ensureDirectoryExists = (dir: string) => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true })
  }
}

const writeFiles = (outputDir: string, files: Record<string, string>) => {
  ensureDirectoryExists(outputDir)

  for (const [filename, content] of Object.entries(files)) {
    const filePath = path.join(outputDir, filename)
    ensureDirectoryExists(path.dirname(filePath))
    fs.writeFileSync(filePath, content, 'utf-8')
    console.log(`   ✓ Generated ${path.relative(ROOT_DIR, filePath)}`)
  }
}

/** Remove previously generated files so stale platform-specific outputs are not left behind. */
const cleanGeneratedDirectory = (outputDir: string, shouldRemove: (filename: string) => boolean) => {
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

const cleanTypeScriptPropsDirectory = (outputDir: string) => {
  cleanGeneratedDirectory(outputDir, (filename) => filename === '.generated' || filename.endsWith('.ts'))
}

const cleanSwiftParametersDirectory = (outputDir: string) => {
  cleanGeneratedDirectory(
    outputDir,
    (filename) =>
      filename === '.generated' || filename === 'ComponentParameters.swift' || filename.endsWith('Parameters.swift')
  )
}

const cleanKotlinParametersDirectory = (outputDir: string) => {
  cleanGeneratedDirectory(outputDir, (filename) => filename.endsWith('Parameters.kt'))
}

const runFormatScript = (scriptName: string, stepLabel: string) => {
  console.log(`Step ${stepLabel}: Running npm run ${scriptName}...`)
  try {
    const result = execSync(`npm run ${scriptName}`, { encoding: 'utf-8', cwd: ROOT_DIR })
    if (result.trim()) {
      console.log(result.trim())
    }
  } catch (error: any) {
    console.warn(`   Warning: npm run ${scriptName} exited with code ${error.status ?? 'unknown'}`)
    if (error.stdout) console.log('   stdout:', error.stdout.trim())
    if (error.stderr) console.log('   stderr:', error.stderr.trim())
  }
  console.log()
}

const runWorkspaceFormatScript = (scriptName: string, workspace: string, stepLabel: string) => {
  console.log(`Step ${stepLabel}: Running npm run ${scriptName} --workspace ${workspace}...`)
  try {
    execSync(`npm run ${scriptName} --workspace ${workspace}`, {
      encoding: 'utf-8',
      cwd: REPO_ROOT,
      stdio: 'inherit',
    })
  } catch (error: any) {
    console.warn(
      `   Warning: npm run ${scriptName} --workspace ${workspace} exited with code ${error.status ?? 'unknown'}`
    )
    if (error.stdout) console.log('   stdout:', String(error.stdout).trim())
    if (error.stderr) console.log('   stderr:', String(error.stderr).trim())
  }
  console.log()
}

const fromRoot = (targetPath: string) => path.relative(ROOT_DIR, targetPath) || '.'

const main = () => {
  console.log('🚀 Generating types from schemas...\n')

  console.log('Step 1: Validating components schema...')
  if (!validateComponentsSchema()) {
    console.error('\n❌ Generation failed due to components validation errors')
    process.exit(1)
  }
  console.log()

  console.log('Step 2: Loading components data...')
  const componentsContent = fs.readFileSync(COMPONENTS_DATA_PATH, 'utf-8')
  const componentsData: ComponentsData = JSON.parse(componentsContent)
  const componentsWithParams = componentsData.components.filter((c) => Object.keys(c.parameters).length > 0).length
  console.log(
    `   ✓ Loaded ${componentsData.components.length} components (${componentsWithParams} with parameters, version ${componentsData.version})`
  )
  console.log()

  console.log('Step 3: Generating TypeScript component props types...')
  const tsIosJsxResult = generateTypeScriptJSX(componentsData, 'ios')
  const tsAndroidJsxResult = generateTypeScriptJSX(componentsData, 'android')
  cleanTypeScriptPropsDirectory(TS_IOS_PROPS_OUTPUT_DIR)
  cleanTypeScriptPropsDirectory(TS_ANDROID_PROPS_OUTPUT_DIR)
  writeFiles(TS_IOS_PROPS_OUTPUT_DIR, tsIosJsxResult.props)
  writeFiles(TS_ANDROID_PROPS_OUTPUT_DIR, tsAndroidJsxResult.props)
  console.log()

  console.log('Step 4: Generating Swift parameter types...')
  cleanSwiftParametersDirectory(SWIFT_PARAMETERS_OUTPUT_DIR)
  const swiftParameterFiles = generateSwiftParameters(componentsData)
  writeFiles(SWIFT_PARAMETERS_OUTPUT_DIR, swiftParameterFiles)
  console.log()

  console.log('Step 5: Generating Kotlin parameter types...')
  cleanKotlinParametersDirectory(KOTLIN_PARAMETERS_OUTPUT_DIR)
  const kotlinParameterFiles = generateKotlinParameters(componentsData)
  writeFiles(KOTLIN_PARAMETERS_OUTPUT_DIR, kotlinParameterFiles)
  console.log()

  console.log('Step 6: Generating component ID mappings...')
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
  writeFiles(TS_IOS_PAYLOAD_OUTPUT_DIR, tsIosComponentIdFiles)
  writeFiles(TS_ANDROID_PAYLOAD_OUTPUT_DIR, tsAndroidComponentIdFiles)
  writeFiles(SWIFT_SHARED_OUTPUT_DIR, swiftComponentIdFiles)
  writeFiles(KOTLIN_PAYLOAD_OUTPUT_DIR, kotlinComponentIdFiles)
  console.log()

  console.log('Step 7: Generating unified short names mappings...')
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
  writeFiles(TS_CORE_PAYLOAD_OUTPUT_DIR, tsShortNameFiles)
  writeFiles(SWIFT_SHARED_OUTPUT_DIR, swiftShortNameFiles)
  writeFiles(KOTLIN_GENERATED_DIR, kotlinShortNameFiles)
  console.log()

  runFormatScript('format:js:fix', '8')
  runWorkspaceFormatScript('format:kotlin:fix', '@use-voltra/android-client', '9')
  runWorkspaceFormatScript('format:swift:fix', '@use-voltra/ios-client', '10')

  console.log('✅ Generation complete!\n')
  console.log('Generated files:')
  console.log(
    `   TypeScript iOS props: ${Object.keys(tsIosJsxResult.props).length} files in ${fromRoot(
      TS_IOS_PROPS_OUTPUT_DIR
    )}/`
  )
  console.log(
    `   TypeScript Android props: ${Object.keys(tsAndroidJsxResult.props).length} files in ${fromRoot(
      TS_ANDROID_PROPS_OUTPUT_DIR
    )}/`
  )
  console.log(
    `   Swift parameters: ${Object.keys(swiftParameterFiles).length} files in ${fromRoot(SWIFT_PARAMETERS_OUTPUT_DIR)}/`
  )
  console.log(
    `   Kotlin parameters: ${Object.keys(kotlinParameterFiles).length} files in ${fromRoot(
      KOTLIN_PARAMETERS_OUTPUT_DIR
    )}/`
  )
  console.log(
    `   Component IDs: ${Object.keys(tsIosComponentIdFiles).length} iOS TypeScript, ${
      Object.keys(tsAndroidComponentIdFiles).length
    } Android TypeScript, ${Object.keys(swiftComponentIdFiles).length} Swift, ${
      Object.keys(kotlinComponentIdFiles).length
    } Kotlin`
  )
  console.log(
    `   Short names: ${Object.keys(tsShortNameFiles).length} TypeScript in ${fromRoot(TS_CORE_PAYLOAD_OUTPUT_DIR)}/, ${
      Object.keys(swiftShortNameFiles).length
    } Swift, ${Object.keys(kotlinShortNameFiles).length} Kotlin`
  )
  console.log()
  console.log('Next steps:')
  console.log('   1. Review generated files')
  console.log(
    `   2. Create component files manually in ${fromRoot(TS_IOS_PROPS_OUTPUT_DIR)}/ and ${fromRoot(
      TS_ANDROID_PROPS_OUTPUT_DIR
    )}/ using createVoltraComponent`
  )
  console.log('   3. Run tests to ensure everything works')
}

if (require.main === module) {
  try {
    main()
  } catch (error) {
    console.error('❌ Generation failed:', error)
    process.exit(1)
  }
}
