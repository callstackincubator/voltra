#!/usr/bin/env node
import * as fs from 'node:fs'
import * as path from 'node:path'

import { generateSwiftParameters } from './generators/swift-parameters'
import { generateTypeScriptJSX } from './generators/typescript-jsx'
import { generateComponentIds } from './generators/component-ids'
import type { ComponentsData } from './types'
import { validateComponentsSchema } from './validate-components'

const ROOT_DIR = path.join(__dirname, '..')
const COMPONENTS_DATA_PATH = path.join(ROOT_DIR, 'data/components.json')
const TS_PROPS_OUTPUT_DIR = path.join(ROOT_DIR, 'src/jsx/props')
const TS_PAYLOAD_OUTPUT_DIR = path.join(ROOT_DIR, 'src/payload')
const SWIFT_GENERATED_DIR = path.join(ROOT_DIR, 'ios/target/Generated')
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

  // Step 4: Generate Swift parameter types
  console.log('Step 4: Generating Swift parameter types...')
  const swiftParameterFiles = generateSwiftParameters(componentsData)
  writeFiles(SWIFT_PARAMETERS_OUTPUT_DIR, swiftParameterFiles)
  console.log()

  // Step 5: Generate component ID mappings
  console.log('Step 5: Generating component ID mappings...')
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

  console.log('✅ Generation complete!\n')
  console.log('Generated files:')
  console.log(
    `   TypeScript props and components: ${Object.keys(tsJsxResult.props).length + Object.keys(tsJsxResult.jsx).length} files in src/jsx/`
  )
  console.log(`   Swift parameters: ${Object.keys(swiftParameterFiles).length} files in ios/.../Generated/Parameters/`)
  console.log(
    `   Component IDs: ${Object.keys(tsComponentIdFiles).length} TypeScript files, ${Object.keys(swiftComponentIdFiles).length} Swift files`
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
