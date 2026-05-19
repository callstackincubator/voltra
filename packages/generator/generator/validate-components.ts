#!/usr/bin/env node
import Ajv, { type AnySchema } from 'ajv'
import * as fs from 'fs'
import * as path from 'path'

import type { ComponentsData } from './types'

const ROOT_DIR = path.join(__dirname, '..')
const SCHEMA_PATH = path.join(ROOT_DIR, 'schemas/components.schema.json')
const DATA_PATH = path.join(ROOT_DIR, 'data/components.json')

type ValidationLogger = Pick<typeof console, 'log' | 'warn' | 'error'>

type ValidateComponentsSchemaOptions = {
  schemaPath?: string
  dataPath?: string
  logger?: ValidationLogger
}

export function validateComponentsData(
  schema: unknown,
  data: ComponentsData,
  logger: ValidationLogger = console
): boolean {
  logger.log('Validating components schema...')

  const ajv = new Ajv({ allErrors: true })
  const validate = ajv.compile(schema as AnySchema)
  const valid = validate(data)

  if (!valid) {
    logger.error('❌ Schema validation failed:')
    if (validate.errors) {
      for (const error of validate.errors) {
        logger.error(`   ${error.instancePath} ${error.message}`)
      }
    }
    return false
  }

  const names = new Set<string>()
  const duplicates: string[] = []

  for (const component of data.components) {
    if (names.has(component.name)) {
      duplicates.push(component.name)
    }
    names.add(component.name)
  }

  if (duplicates.length > 0) {
    logger.error('❌ Duplicate component names found:', duplicates.join(', '))
    return false
  }

  const invalidParamNames: string[] = []
  for (const component of data.components) {
    for (const paramName of Object.keys(component.parameters)) {
      if (!/^[a-zA-Z_$][a-zA-Z0-9_$]*$/.test(paramName)) {
        invalidParamNames.push(`${component.name}.${paramName}`)
      }
    }
  }

  if (invalidParamNames.length > 0) {
    logger.error('❌ Invalid parameter names (must be valid JavaScript identifiers):')
    for (const name of invalidParamNames) {
      logger.error(`   ${name}`)
    }
    return false
  }

  logger.log('✅ Components schema is valid')
  logger.log(`   Version: ${data.version}`)
  logger.log(`   Components: ${data.components.length}`)
  const withParams = data.components.filter((c) => Object.keys(c.parameters).length > 0).length
  logger.log(`   Components with parameters: ${withParams}`)

  return true
}

export function validateComponentsSchema(options: ValidateComponentsSchemaOptions = {}): boolean {
  const { schemaPath = SCHEMA_PATH, dataPath = DATA_PATH, logger = console } = options

  const schemaContent = fs.readFileSync(schemaPath, 'utf-8')
  const schema = JSON.parse(schemaContent)

  const dataContent = fs.readFileSync(dataPath, 'utf-8')
  const data: ComponentsData = JSON.parse(dataContent)

  return validateComponentsData(schema, data, logger)
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
