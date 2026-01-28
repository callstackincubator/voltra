import type { ComponentsData } from '../types'

type GeneratedFiles = {
  [filename: string]: string
}

const generateIOSTypeScriptMappings = (data: ComponentsData): string => {
  const { version, components } = data

  // Filter iOS components (swiftAvailability !== 'Not available')
  const iosComponents = components.filter((comp) => comp.swiftAvailability !== 'Not available')

  // Create name to ID mapping with sequential IDs
  const nameToIdEntries = iosComponents.map((comp, index) => `  '${comp.name}': ${index}`).join(',\n')

  // Create ID to name mapping
  const idToNameEntries = iosComponents.map((comp, index) => `  ${index}: '${comp.name}'`).join(',\n')

  return `/* eslint-disable */
// 🤖 AUTO-GENERATED from data/components.json
// DO NOT EDIT MANUALLY - Changes will be overwritten
// Schema version: ${version}

/**
 * Mapping from component name to numeric ID
 * Component IDs are assigned sequentially based on order in components.json (0-indexed)
 */
export const COMPONENT_NAME_TO_ID: Record<string, number> = {
${nameToIdEntries}
}

/**
 * Mapping from numeric ID to component name
 */
export const COMPONENT_ID_TO_NAME: Record<number, string> = {
${idToNameEntries}
}

/**
 * Get component ID from name
 * @throws Error if component name is not found
 */
export function getComponentId(name: string): number {
  const id = COMPONENT_NAME_TO_ID[name]
  if (id === undefined) {
    throw new Error(\`Unknown component name: "\${name}". Available components: \${Object.keys(COMPONENT_NAME_TO_ID).join(', ')}\`)
  }
  return id
}

/**
 * Get component name from ID
 * @throws Error if component ID is not found
 */
export function getComponentName(id: number): string {
  const name = COMPONENT_ID_TO_NAME[id]
  if (name === undefined) {
    throw new Error(\`Unknown component ID: \${id}. Valid IDs: 0-\${Object.keys(COMPONENT_ID_TO_NAME).length - 1}\`)
  }
  return name
}
`
}

const generateAndroidTypeScriptMappings = (data: ComponentsData): string => {
  const { version, components } = data

  // Filter Android components (has androidAvailability)
  const androidComponents = components.filter((comp) => !!comp.androidAvailability)

  // Create name to ID mapping with sequential IDs
  const nameToIdEntries = androidComponents.map((comp, index) => `  '${comp.name}': ${index}`).join(',\n')

  // Create ID to name mapping
  const idToNameEntries = androidComponents.map((comp, index) => `  ${index}: '${comp.name}'`).join(',\n')

  return `/* eslint-disable */
// 🤖 AUTO-GENERATED from data/components.json
// DO NOT EDIT MANUALLY - Changes will be overwritten
// Schema version: ${version}

/**
 * Mapping from Android component name to numeric ID
 * Component IDs are assigned sequentially based on order in components.json (0-indexed)
 */
export const ANDROID_COMPONENT_NAME_TO_ID: Record<string, number> = {
${nameToIdEntries}
}

/**
 * Mapping from numeric ID to Android component name
 */
export const ANDROID_COMPONENT_ID_TO_NAME: Record<number, string> = {
${idToNameEntries}
}

/**
 * Get Android component ID from name
 * @throws Error if component name is not found
 */
export function getAndroidComponentId(name: string): number {
  const id = ANDROID_COMPONENT_NAME_TO_ID[name]
  if (id === undefined) {
    throw new Error(\`Unknown Android component name: "\${name}". Available components: \${Object.keys(ANDROID_COMPONENT_NAME_TO_ID).join(', ')}\`)
  }
  return id
}

/**
 * Get Android component name from ID
 * @throws Error if component ID is not found
 */
export function getAndroidComponentName(id: number): string {
  const name = ANDROID_COMPONENT_ID_TO_NAME[id]
  if (name === undefined) {
    throw new Error(\`Unknown Android component ID: \${id}. Valid IDs: 0-\${Object.keys(ANDROID_COMPONENT_ID_TO_NAME).length - 1}\`)
  }
  return name
}
`
}

const generateSwiftMapping = (data: ComponentsData): string => {
  const { version, components } = data

  const swiftComponents = components.filter((comp) => comp.swiftAvailability !== 'Not available')

  // Generate enum cases for each component
  const enumCases = swiftComponents
    .map((comp, index) => {
      // Convert component name to Swift enum case name (handle special cases)
      const caseName = comp.name
        .replace(/([A-Z])/g, '_$1')
        .toUpperCase()
        .replace(/^_/, '')
      return `    case ${caseName} = ${index}`
    })
    .join('\n')

  // Generate switch cases for ID to name conversion
  const switchCases = swiftComponents
    .map((comp) => {
      const caseName = comp.name
        .replace(/([A-Z])/g, '_$1')
        .toUpperCase()
        .replace(/^_/, '')
      return `        case .${caseName}:\n            return "${comp.name}"`
    })
    .join('\n')

  return `//
//  ComponentTypeID.swift
//
//  AUTO-GENERATED from data/components.json
//  DO NOT EDIT MANUALLY - Changes will be overwritten
//  Schema version: ${version}

import Foundation

/// Component type IDs mapped from data/components.json
/// IDs are assigned sequentially based on order in components.json (0-indexed)
public enum ComponentTypeID: Int, Codable {
${enumCases}

    /// Get the component name string for this ID
    public var componentName: String {
        switch self {
${switchCases}
        }
    }

    /// Initialize from component name string
    /// - Parameter name: Component name (e.g., "Text", "VStack")
    /// - Returns: ComponentTypeID if found, nil otherwise
    public init?(componentName: String) {
        switch componentName {
${swiftComponents
  .map((comp) => {
    const caseName = comp.name
      .replace(/([A-Z])/g, '_$1')
      .toUpperCase()
      .replace(/^_/, '')
    return `        case "${comp.name}": self = .${caseName}`
  })
  .join('\n')}
        default:
            return nil
        }
    }
}
`
}

/**
 * Generate Kotlin mapping
 */
const generateKotlinMapping = (data: ComponentsData): string => {
  const { version, components } = data

  const androidComponents = components.filter((comp) => !!comp.androidAvailability)

  // Generate constant names by removing "Android" prefix and converting to SCREAMING_SNAKE_CASE
  const toConstantName = (name: string): string => {
    // Remove "Android" prefix if present
    const withoutPrefix = name.replace(/^Android/, '')
    // Convert to SCREAMING_SNAKE_CASE
    return withoutPrefix
      .replace(/([A-Z])/g, '_$1')
      .toUpperCase()
      .replace(/^_/, '')
  }

  // Generate component ID constants
  const constants = androidComponents
    .map((comp, index) => {
      const constantName = toConstantName(comp.name)
      return `    const val ${constantName} = ${index}`
    })
    .join('\n')

  // Generate getName cases
  const idToNameCases = androidComponents.map((comp, index) => `            ${index} -> "${comp.name}"`).join('\n')

  return `//
//  ComponentTypeID.kt
//
//  AUTO-GENERATED from data/components.json
//  DO NOT EDIT MANUALLY - Changes will be overwritten
//  Schema version: ${version}

package voltra.payload

/**
 * Component type IDs mapped from data/components.json
 * IDs are assigned sequentially based on order in components.json (0-indexed)
 */
object ComponentTypeID {
${constants}

    /**
     * Get component name from numeric ID
     */
    fun getComponentName(id: Int): String? {
        return when (id) {
${idToNameCases}
            else -> null
        }
    }
}
`
}

export const generateComponentIds = (data: ComponentsData): GeneratedFiles => {
  const files: GeneratedFiles = {}

  // Generate iOS TypeScript mappings
  files['component-ids.ts'] = generateIOSTypeScriptMappings(data)

  // Generate Android TypeScript mappings
  files['android-component-ids.ts'] = generateAndroidTypeScriptMappings(data)

  // Generate Swift enum
  files['ComponentTypeID.swift'] = generateSwiftMapping(data)

  // Generate Kotlin mapping
  files['ComponentTypeID.kt'] = generateKotlinMapping(data)

  return files
}
