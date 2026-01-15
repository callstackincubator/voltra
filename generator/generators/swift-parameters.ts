import type { ComponentDefinition, ComponentParameter, ComponentsData } from '../types'

type GeneratedFiles = {
  [filename: string]: string
}

const toSwiftType = (param: ComponentParameter): string => {
  if (param.type === 'component') {
    // Component props are accessed via component.componentProp() helper, not through parameters struct
    return 'String'
  } else if (param.enum && param.enum.length > 0) {
    // Enums will be generated as nested enums
    return 'String'
  } else if (param.jsonEncoded) {
    return 'String'
  } else {
    switch (param.type) {
      case 'string':
        return 'String'
      case 'number':
        return 'Double'
      case 'boolean':
        return 'Bool'
      case 'object':
      case 'array':
        return 'String' // JSON-encoded
      default:
        return 'String'
    }
  }
}

const generateParameterStruct = (component: ComponentDefinition, version: string): string => {
  const params = Object.entries(component.parameters)
  const paramsWithDefaults = params.filter(([_, param]) => param.default !== undefined)

  const header = `//
//  ${component.name}Parameters.swift

//  AUTO-GENERATED from data/components.json
//  DO NOT EDIT MANUALLY - Changes will be overwritten
//  Schema version: ${version}

import Foundation

/// Parameters for ${component.name} component
/// ${component.description}
public struct ${component.name}Parameters: ComponentParameters {
`

  // All properties are now `let` with no inline defaults - values come from init
  const properties = params
    .map(([name, param]) => {
      const description = param.description ? `    /// ${param.description}\n` : ''
      const swiftType = toSwiftType(param)
      const hasDefault = param.default !== undefined
      // Properties with defaults are non-optional (we provide the default in init)
      // Properties without defaults are optional
      const typeDeclaration = hasDefault ? `${swiftType}` : `${swiftType}?`
      return `${description}    public let ${name}: ${typeDeclaration}`
    })
    .join('\n\n')

  // Generate custom init only if there are params with defaults
  let customInit = ''
  if (paramsWithDefaults.length > 0) {
    const codingKeysEnum = params.map(([name]) => `        case ${name}`).join('\n')

    const decoderStatements = params
      .map(([name, param]) => {
        const swiftType = toSwiftType(param)
        if (param.default !== undefined) {
          // Use decodeIfPresent and fall back to default
          const defaultValue = JSON.stringify(param.default)
          return `        ${name} = try container.decodeIfPresent(${swiftType}.self, forKey: .${name}) ?? ${defaultValue}`
        } else {
          // Optional property, just decode if present
          return `        ${name} = try container.decodeIfPresent(${swiftType}.self, forKey: .${name})`
        }
      })
      .join('\n')

    customInit = `

    enum CodingKeys: String, CodingKey {
${codingKeysEnum}
    }

    public init(from decoder: Decoder) throws {
        let container = try decoder.container(keyedBy: CodingKeys.self)
${decoderStatements}
    }`
  }

  const footer = '\n}\n'

  return header + properties + customInit + footer
}

const generateProtocol = (version: string): string => {
  return `//
//  ComponentParameters.swift
//
//  AUTO-GENERATED from data/components.json
//  DO NOT EDIT MANUALLY - Changes will be overwritten
//  Schema version: ${version}

import Foundation

/// Protocol marker for all component parameter types
/// All component-specific parameter structs conform to this protocol
public protocol ComponentParameters: Codable, Hashable {}
`
}

export const generateSwiftParameters = (data: ComponentsData): GeneratedFiles => {
  const files: GeneratedFiles = {}

  // Generate protocol
  files['ComponentParameters.swift'] = generateProtocol(data.version)

  // Generate parameter structs for each component
  for (const component of data.components) {
    if (component.swiftAvailability !== 'Not available') {
      const content = generateParameterStruct(component, data.version)
      files[`${component.name}Parameters.swift`] = content
    }
  }

  // Generate marker file
  files['.generated'] = `This directory contains auto-generated Swift parameter files.
DO NOT EDIT MANUALLY.

Generated from: data/components.json
Schema version: ${data.version}

To regenerate these files, run:
  npm run generate
`

  return files
}
