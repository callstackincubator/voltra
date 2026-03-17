#!/usr/bin/env node
import Ajv from 'ajv'
import * as fs from 'fs'
import * as path from 'path'

import type { ComponentsData } from './types'

const ROOT_DIR = path.join(__dirname, '..')
const SCHEMA_PATH = path.join(ROOT_DIR, 'schemas/components.schema.json')
const DATA_PATH = path.join(ROOT_DIR, 'data/components.json')

export function validateComponentsSchema(): boolean {
  console.log('Validating components schema...')

  // Load schema
  const schemaContent = fs.readFileSync(SCHEMA_PATH, 'utf-8')
  const schema = JSON.parse(schemaContent)

  // Load data
  const dataContent = fs.readFileSync(DATA_PATH, 'utf-8')
  const data: ComponentsData = JSON.parse(dataContent)

  // Validate with Ajv
  const ajv = new Ajv({ allErrors: true })
  const validate = ajv.compile(schema)
  const valid = validate(data)

  if (!valid) {
    console.error('❌ Schema validation failed:')
    if (validate.errors) {
      for (const error of validate.errors) {
        console.error(`   ${error.instancePath} ${error.message}`)
      }
    }
    return false
  }

  // Additional validation: check for duplicate component names
  const names = new Set<string>()
  const duplicates: string[] = []

  for (const component of data.components) {
    if (names.has(component.name)) {
      duplicates.push(component.name)
    }
    names.add(component.name)
  }

  if (duplicates.length > 0) {
    console.error('❌ Duplicate component names found:', duplicates.join(', '))
    return false
  }

  // Additional validation: check for invalid parameter names
  const invalidParamNames: string[] = []
  for (const component of data.components) {
    for (const paramName of Object.keys(component.parameters)) {
      // Parameter names should be valid JavaScript identifiers
      if (!/^[a-zA-Z_$][a-zA-Z0-9_$]*$/.test(paramName)) {
        invalidParamNames.push(`${component.name}.${paramName}`)
      }
    }
  }

  if (invalidParamNames.length > 0) {
    console.error('❌ Invalid parameter names (must be valid JavaScript identifiers):')
    for (const name of invalidParamNames) {
      console.error(`   ${name}`)
    }
    return false
  }

  console.log('✅ Components schema is valid')
  console.log(`   Version: ${data.version}`)
  console.log(`   Components: ${data.components.length}`)
  const withParams = data.components.filter((c) => Object.keys(c.parameters).length > 0).length
  console.log(`   Components with parameters: ${withParams}`)

  return true
}

// Run if executed directly
if (require.main === module) {
  try {
    const valid = validateComponentsSchema()
    process.exit(valid ? 0 : 1)
  } catch (error) {
    console.error('❌ Validation failed:', error)
    process.exit(1)
  }
}
