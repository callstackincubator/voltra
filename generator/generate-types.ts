#!/usr/bin/env node
import * as fs from 'node:fs'
import * as path from 'node:path'

import { generateSwiftTypes } from './generators/swift'
import { generateSwiftParameters } from './generators/swift-parameters'
import { generateTypeScriptTypes } from './generators/typescript'
import { generateTypeScriptJSX } from './generators/typescript-jsx'
import type { ComponentsData, ModifiersData } from './types'
import { validateComponentsSchema } from './validate-components'
import { validateModifiersSchema } from './validate-schema'

const ROOT_DIR = path.join(__dirname, '..')
const MODIFIERS_DATA_PATH = path.join(ROOT_DIR, 'data/modifiers.json')
const COMPONENTS_DATA_PATH = path.join(ROOT_DIR, 'data/components.json')
const TS_MODIFIERS_OUTPUT_DIR = path.join(ROOT_DIR, 'src/modifiers')
const TS_PROPS_OUTPUT_DIR = path.join(ROOT_DIR, 'src/jsx/props')
const SWIFT_GENERATED_DIR = path.join(ROOT_DIR, 'ios/target/Generated')
const SWIFT_MODIFIERS_OUTPUT_DIR = path.join(SWIFT_GENERATED_DIR, 'Modifiers')
const SWIFT_PARAMETERS_OUTPUT_DIR = path.join(SWIFT_GENERATED_DIR, 'Parameters')

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

  // Step 1: Validate modifiers schema
  console.log('Step 1: Validating modifiers schema...')
  if (!validateModifiersSchema()) {
    console.error('\n❌ Generation failed due to modifiers validation errors')
    process.exit(1)
  }
  console.log()

  // Step 2: Validate components schema
  console.log('Step 2: Validating components schema...')
  if (!validateComponentsSchema()) {
    console.error('\n❌ Generation failed due to components validation errors')
    process.exit(1)
  }
  console.log()

  // Step 3: Load modifiers data
  console.log('Step 3: Loading modifiers data...')
  const modifiersContent = fs.readFileSync(MODIFIERS_DATA_PATH, 'utf-8')
  const modifiersData: ModifiersData = JSON.parse(modifiersContent)
  console.log(`   ✓ Loaded ${modifiersData.modifiers.length} modifiers (version ${modifiersData.version})`)
  console.log()

  // Step 4: Load components data
  console.log('Step 4: Loading components data...')
  const componentsContent = fs.readFileSync(COMPONENTS_DATA_PATH, 'utf-8')
  const componentsData: ComponentsData = JSON.parse(componentsContent)
  const componentsWithParams = componentsData.components.filter((c) => Object.keys(c.parameters).length > 0).length
  console.log(
    `   ✓ Loaded ${componentsData.components.length} components (${componentsWithParams} with parameters, version ${componentsData.version})`
  )
  console.log()

  // Step 5: Generate TypeScript modifier types
  console.log('Step 5: Generating TypeScript modifier types...')
  const tsModifierFiles = generateTypeScriptTypes(modifiersData)
  writeFiles(TS_MODIFIERS_OUTPUT_DIR, tsModifierFiles)
  console.log()

  // Step 6: Generate TypeScript component props types and component exports
  console.log('Step 7: Generating TypeScript component props types and component exports...')
  const tsJsxResult = generateTypeScriptJSX(componentsData)
  writeFiles(TS_PROPS_OUTPUT_DIR, tsJsxResult.props)
  console.log()

  // Step 7: Generate Swift modifier types
  console.log('Step 8: Generating Swift modifier types...')
  const swiftModifierFiles = generateSwiftTypes(modifiersData)
  writeFiles(SWIFT_MODIFIERS_OUTPUT_DIR, swiftModifierFiles)
  console.log()

  // Step 8: Generate Swift parameter types
  console.log('Step 9: Generating Swift parameter types...')
  const swiftParameterFiles = generateSwiftParameters(componentsData)
  writeFiles(SWIFT_PARAMETERS_OUTPUT_DIR, swiftParameterFiles)
  console.log()

  console.log('✅ Generation complete!\n')
  console.log('Generated files:')
  console.log(`   TypeScript modifiers: ${Object.keys(tsModifierFiles).length} files in src/modifiers/`)
  console.log(
    `   TypeScript props and components: ${Object.keys(tsJsxResult.props).length + Object.keys(tsJsxResult.jsx).length} files in src/jsx/`
  )
  console.log(`   Swift modifiers: ${Object.keys(swiftModifierFiles).length} files in ios/.../Generated/Modifiers/`)
  console.log(`   Swift parameters: ${Object.keys(swiftParameterFiles).length} files in ios/.../Generated/Parameters/`)
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
