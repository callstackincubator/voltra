import type { ComponentsData } from '../types'

type GeneratedFiles = {
  [filename: string]: string
}

const generateTypeScriptMappings = (data: ComponentsData): string => {
  const { version, components } = data

  // Create name to ID mapping
  const nameToIdEntries = components.map((comp, index) => `  '${comp.name}': ${index}`).join(',\n')

  // Create ID to name mapping
  const idToNameEntries = components.map((comp, index) => `  ${index}: '${comp.name}'`).join(',\n')

  return `// 🤖 AUTO-GENERATED from data/components.json
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

const generateSwiftMapping = (data: ComponentsData): string => {
  const { version, components } = data

  // Generate enum cases for each component
  const enumCases = components
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
  const switchCases = components
    .map((comp, index) => {
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
${components
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

export const generateComponentIds = (data: ComponentsData): GeneratedFiles => {
  const files: GeneratedFiles = {}

  // Generate TypeScript mappings
  files['component-ids.ts'] = generateTypeScriptMappings(data)

  // Generate Swift enum
  files['ComponentTypeID.swift'] = generateSwiftMapping(data)

  return files
}
