import type { ComponentDefinition, ComponentParameter, ComponentsData } from '../types'

type GeneratedFiles = {
  [filename: string]: string
}

const toSwiftType = (param: ComponentParameter): string => {
  if (param.enum && param.enum.length > 0) {
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

  const properties = params
    .map(([name, param]) => {
      const description = param.description ? `    /// ${param.description}\n` : ''
      const swiftType = toSwiftType(param)
      return `${description}    public let ${name}: ${swiftType}?`
    })
    .join('\n\n')

  const footer = '\n}\n'

  return header + properties + footer
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
    const content = generateParameterStruct(component, data.version)
    files[`${component.name}Parameters.swift`] = content
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
