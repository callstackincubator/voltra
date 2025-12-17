#!/usr/bin/env node
import * as fs from 'node:fs'
import * as path from 'node:path'
import { execSync } from 'node:child_process'

import { generateSwiftParameters } from './generators/swift-parameters'
import { generateTypeScriptJSX } from './generators/typescript-jsx'
import { generateComponentIds } from './generators/component-ids'
import { generateShortNames } from './generators/short-names'
import type { ComponentsData } from './types'
import { validateComponentsSchema } from './validate-components'

const ROOT_DIR = path.join(__dirname, '..')
const COMPONENTS_DATA_PATH = path.join(ROOT_DIR, 'data/components.json')
const TS_PROPS_OUTPUT_DIR = path.join(ROOT_DIR, 'src/jsx/props')
const TS_JSX_OUTPUT_DIR = path.join(ROOT_DIR, 'src/jsx')
const TS_PAYLOAD_OUTPUT_DIR = path.join(ROOT_DIR, 'src/payload')
const SWIFT_GENERATED_DIR = path.join(ROOT_DIR, 'ios/ui/Generated')
const SWIFT_PARAMETERS_OUTPUT_DIR = path.join(SWIFT_GENERATED_DIR, 'Parameters')
const SWIFT_SHARED_OUTPUT_DIR = path.join(ROOT_DIR, 'ios/shared')

const ensureDirectoryExists = (dir: string) => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true })
  }
}

const writeFiles = (outputDir: string, files: Record<string, string>) => {
  ensureDirectoryExists(outputDir)

  for (const [filename, content] of Object.entries(files)) {
    const filePath = path.join(outputDir, filename)
    // Ensure the directory for this specific file exists (handles nested paths)
    ensureDirectoryExists(path.dirname(filePath))
    fs.writeFileSync(filePath, content, 'utf-8')
    console.log(`   ✓ Generated ${path.relative(ROOT_DIR, filePath)}`)
  }
}

const main = () => {
  console.log('🚀 Generating types from schemas...\n')

  // Step 1: Validate components schema
  console.log('Step 1: Validating components schema...')
  if (!validateComponentsSchema()) {
    console.error('\n❌ Generation failed due to components validation errors')
    process.exit(1)
  }
  console.log()

  // Step 2: Load components data
  console.log('Step 2: Loading components data...')
  const componentsContent = fs.readFileSync(COMPONENTS_DATA_PATH, 'utf-8')
  const componentsData: ComponentsData = JSON.parse(componentsContent)
  const componentsWithParams = componentsData.components.filter((c) => Object.keys(c.parameters).length > 0).length
  console.log(
    `   ✓ Loaded ${componentsData.components.length} components (${componentsWithParams} with parameters, version ${componentsData.version})`
  )
  console.log()

  // Step 3: Generate TypeScript component props types and component exports
  console.log('Step 3: Generating TypeScript component props types and component exports...')
  const tsJsxResult = generateTypeScriptJSX(componentsData)
  writeFiles(TS_PROPS_OUTPUT_DIR, tsJsxResult.props)
  console.log()

  // Step 4: Lint and fix generated TypeScript files
  console.log('Step 4: Running eslint --fix on generated TypeScript files...')
  const generatedTsFiles = Object.keys(tsJsxResult.props).map((filename) => path.join(TS_PROPS_OUTPUT_DIR, filename))
  if (generatedTsFiles.length > 0) {
    const eslintCommand = `npx eslint --fix ${generatedTsFiles.join(' ')}`
    try {
      const result = require('child_process').execSync(eslintCommand, { encoding: 'utf-8', cwd: ROOT_DIR })
      if (result) {
        console.log('   ESLint output:', result.trim())
      }
    } catch (error: any) {
      // ESLint might exit with code 1 if it fixed issues, which is normal
      if (error.status !== 0 && error.status !== 1) {
        console.warn('   Warning: ESLint exited with code', error.status)
        if (error.stdout) console.log('   stdout:', error.stdout.trim())
        if (error.stderr) console.log('   stderr:', error.stderr.trim())
      } else if (error.stdout) {
        console.log('   ESLint output:', error.stdout.trim())
      }
    }
  }
  console.log()

  // Step 5: Generate Swift parameter types
  console.log('Step 5: Generating Swift parameter types...')
  const swiftParameterFiles = generateSwiftParameters(componentsData)
  writeFiles(SWIFT_PARAMETERS_OUTPUT_DIR, swiftParameterFiles)
  console.log()

  // Step 6: Generate component ID mappings
  console.log('Step 6: Generating component ID mappings...')
  const componentIdFiles = generateComponentIds(componentsData)
  // Split files by destination
  const tsComponentIdFiles: Record<string, string> = {}
  const swiftComponentIdFiles: Record<string, string> = {}
  for (const [filename, content] of Object.entries(componentIdFiles)) {
    if (filename.endsWith('.ts')) {
      tsComponentIdFiles[filename] = content
    } else if (filename.endsWith('.swift')) {
      swiftComponentIdFiles[filename] = content
    }
  }
  writeFiles(TS_PAYLOAD_OUTPUT_DIR, tsComponentIdFiles)
  writeFiles(SWIFT_SHARED_OUTPUT_DIR, swiftComponentIdFiles)
  console.log()

  // Step 7: Generate unified short names mappings
  console.log('Step 7: Generating unified short names mappings...')
  const shortNameFiles = generateShortNames(componentsData)
  // Split files by destination
  const tsShortNameFiles: Record<string, string> = {}
  const swiftShortNameFiles: Record<string, string> = {}
  for (const [filename, content] of Object.entries(shortNameFiles)) {
    if (filename.endsWith('.ts')) {
      tsShortNameFiles[filename] = content
    } else if (filename.endsWith('.swift')) {
      swiftShortNameFiles[filename] = content
    }
  }
  writeFiles(TS_PAYLOAD_OUTPUT_DIR, tsShortNameFiles)
  writeFiles(SWIFT_SHARED_OUTPUT_DIR, swiftShortNameFiles)
  console.log()

  console.log('✅ Generation complete!\n')
  console.log('Generated files:')
  console.log(
    `   TypeScript props and components: ${Object.keys(tsJsxResult.props).length + Object.keys(tsJsxResult.jsx).length} files in src/jsx/`
  )
  console.log(`   Swift parameters: ${Object.keys(swiftParameterFiles).length} files in ios/ui/Generated/Parameters/`)
  console.log(
    `   Component IDs: ${Object.keys(tsComponentIdFiles).length} TypeScript files, ${Object.keys(swiftComponentIdFiles).length} Swift files`
  )
  console.log(
    `   Short names: ${Object.keys(tsShortNameFiles).length} TypeScript files, ${Object.keys(swiftShortNameFiles).length} Swift files`
  )
  console.log()
  console.log('Next steps:')
  console.log('   1. Review generated files')
  console.log('   2. Create component files manually in src/jsx/ using createVoltraComponent')
  console.log('   3. Run tests to ensure everything works')
}

// Run if executed directly
if (require.main === module) {
  try {
    main()
  } catch (error) {
    console.error('❌ Generation failed:', error)
    process.exit(1)
  }
}
