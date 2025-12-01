#!/usr/bin/env node
import Ajv from 'ajv'
import * as fs from 'fs'
import * as path from 'path'

const ROOT_DIR = path.join(__dirname, '..')
const SCHEMA_PATH = path.join(ROOT_DIR, 'schemas/modifiers.schema.json')
const DATA_PATH = path.join(ROOT_DIR, 'data/modifiers.json')

export const validateModifiersSchema = (): boolean => {
  try {
    // Load schema
    const schemaContent = fs.readFileSync(SCHEMA_PATH, 'utf-8')
    const schema = JSON.parse(schemaContent)

    // Load data
    const dataContent = fs.readFileSync(DATA_PATH, 'utf-8')
    const data = JSON.parse(dataContent)

    // Validate
    const ajv = new Ajv({ allErrors: true })
    const validate = ajv.compile(schema)
    const valid = validate(data)

    if (!valid) {
      console.error('❌ Validation failed!')
      console.error(JSON.stringify(validate.errors, null, 2))
      return false
    }

    console.log('✅ Schema validation passed!')
    console.log(`   Version: ${(data as any).version}`)
    console.log(`   Modifiers: ${(data as any).modifiers.length}`)

    // Additional checks
    const modifierNames = new Set<string>()
    const duplicates: string[] = []

    for (const modifier of (data as any).modifiers) {
      if (modifierNames.has(modifier.name)) {
        duplicates.push(modifier.name)
      }
      modifierNames.add(modifier.name)
    }

    if (duplicates.length > 0) {
      console.error('❌ Duplicate modifier names found:', duplicates)
      return false
    }

    console.log('✅ No duplicate modifier names')
    return true
  } catch (error) {
    console.error('❌ Error during validation:', error)
    return false
  }
}

// Run if executed directly
if (require.main === module) {
  const success = validateModifiersSchema()
  process.exit(success ? 0 : 1)
}
