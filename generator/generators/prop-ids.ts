import type { ComponentsData } from '../types'

type GeneratedFiles = {
  [filename: string]: string
}

const generateTypeScriptMappings = (data: ComponentsData): string => {
  const { version, components } = data

  // Collect all unique prop names across all components
  const propNames = new Set<string>()
  components.forEach((component) => {
    if (component.parameters) {
      Object.keys(component.parameters).forEach((propName) => {
        propNames.add(propName)
      })
    }
  })

  // Convert to sorted array for consistent ID assignment
  // 'style' is always assigned ID 0, then other props follow (starting from ID 1)
  const sortedPropNames = Array.from(propNames).sort()
  const styleIndex = sortedPropNames.indexOf('style')
  if (styleIndex > -1) {
    sortedPropNames.splice(styleIndex, 1)
  }
  // 'style' at position 0, then all other props
  const finalPropNames = ['style', ...sortedPropNames]

  // Create name to ID mapping (0-indexed)
  const nameToIdEntries = finalPropNames.map((name, index) => `  '${name}': ${index}`).join(',\n')

  // Create ID to name mapping
  const idToNameEntries = finalPropNames.map((name, index) => `  ${index}: '${name}'`).join(',\n')

  return `// 🤖 AUTO-GENERATED from data/components.json
// DO NOT EDIT MANUALLY - Changes will be overwritten
// Schema version: ${version}

/**
 * Mapping from prop name to numeric ID
 * 'style' is always assigned ID 0, other props follow sequentially (starting from ID 1)
 */
export const PROP_NAME_TO_ID: Record<string, number> = {
${nameToIdEntries}
}

/**
 * Mapping from numeric ID to prop name
 */
export const PROP_ID_TO_NAME: Record<number, string> = {
${idToNameEntries}
}

/**
 * Get prop ID from name
 * @throws Error if prop name is not found
 */
export function getPropId(name: string): number {
  const id = PROP_NAME_TO_ID[name]
  if (id === undefined) {
    throw new Error(\`Unknown prop name: "\${name}". Available props: \${Object.keys(PROP_NAME_TO_ID).join(', ')}\`)
  }
  return id
}

/**
 * Get prop name from ID
 * @throws Error if prop ID is not found
 */
export function getPropName(id: number): string {
  const name = PROP_ID_TO_NAME[id]
  if (name === undefined) {
    throw new Error(\`Unknown prop ID: \${id}. Valid IDs: 0-\${Object.keys(PROP_ID_TO_NAME).length - 1}\`)
  }
  return name
}
`
}

const generateSwiftMapping = (data: ComponentsData): string => {
  const { version, components } = data

  // Collect all unique prop names
  const propNames = new Set<string>()
  components.forEach((component) => {
    if (component.parameters) {
      Object.keys(component.parameters).forEach((propName) => {
        propNames.add(propName)
      })
    }
  })

  // 'style' is always assigned ID 0, then other props follow (starting from ID 1)
  const sortedPropNames = Array.from(propNames).sort()
  const styleIndex = sortedPropNames.indexOf('style')
  if (styleIndex > -1) {
    sortedPropNames.splice(styleIndex, 1)
  }
  // 'style' at position 0, then all other props
  const finalPropNames = ['style', ...sortedPropNames]

  // Helper function to convert prop name to Swift enum case name
  // Swift enum cases use camelCase, so we keep the prop name as-is
  // but ensure it starts with lowercase
  const toSwiftCaseName = (propName: string): string => {
    // If it starts with uppercase, make it lowercase
    if (propName.charAt(0) === propName.charAt(0).toUpperCase()) {
      return propName.charAt(0).toLowerCase() + propName.slice(1)
    }
    return propName
  }

  // Generate enum cases
  const enumCases = finalPropNames
    .map((propName, index) => {
      const caseName = toSwiftCaseName(propName)
      return `    case ${caseName} = ${index}`
    })
    .join('\n')

  // Generate switch cases for ID to name conversion
  const switchCases = finalPropNames
    .map((propName, index) => {
      const caseName = toSwiftCaseName(propName)
      return `        case .${caseName}:\n            return "${propName}"`
    })
    .join('\n')

  // Generate switch cases for name to ID conversion
  const nameToIdCases = finalPropNames
    .map((propName, index) => {
      const caseName = toSwiftCaseName(propName)
      return `        case "${propName}": self = .${caseName}`
    })
    .join('\n')

  return `//
//  PropNameID.swift
//
//  AUTO-GENERATED from data/components.json
//  DO NOT EDIT MANUALLY - Changes will be overwritten
//  Schema version: ${version}

import Foundation

/// Prop name IDs mapped from data/components.json
/// 'style' is always assigned ID 0, other props follow sequentially (starting from ID 1)
public enum PropNameID: Int, Codable {
${enumCases}
    
    /// Get the prop name string for this ID
    public var propName: String {
        switch self {
${switchCases}
        }
    }
    
    /// Initialize from prop name string
    /// - Parameter name: Prop name (e.g., "title", "systemImage")
    /// - Returns: PropNameID if found, nil otherwise
    public init?(propName: String) {
        switch propName {
${nameToIdCases}
        default:
            return nil
        }
    }
}
`
}

export const generatePropIds = (data: ComponentsData): GeneratedFiles => {
  const files: GeneratedFiles = {}

  // Generate TypeScript mappings
  files['prop-ids.ts'] = generateTypeScriptMappings(data)

  // Generate Swift enum
  files['PropNameID.swift'] = generateSwiftMapping(data)

  return files
}
