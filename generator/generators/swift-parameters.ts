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

  if (params.length === 0) {
    // Skip components with no parameters
    return ''
  }

  const header = `//
//  ${component.name}Parameters.swift
//  VoltraUI
//
//  🤖 AUTO-GENERATED from data/components.json
//  DO NOT EDIT MANUALLY - Changes will be overwritten
//  Schema version: ${version}
//
//  https://github.com/saulsharma/voltra
//  MIT LICENCE

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
//  VoltraUI
//
//  🤖 AUTO-GENERATED from data/components.json
//  DO NOT EDIT MANUALLY - Changes will be overwritten
//  Schema version: ${version}
//
//  https://github.com/saulsharma/voltra
//  MIT LICENCE

import Foundation

/// Protocol marker for all component parameter types
/// All component-specific parameter structs conform to this protocol
public protocol ComponentParameters: Codable, Hashable {}
`
}

const generateComponentExtension = (components: ComponentDefinition[], version: string): string => {
  const header = `//
//  VoltraUIComponent+Parameters.swift
//  VoltraUI
//
//  🤖 AUTO-GENERATED from data/components.json
//  DO NOT EDIT MANUALLY - Changes will be overwritten
//  Schema version: ${version}
//
//  https://github.com/saulsharma/voltra
//  MIT LICENCE

import Foundation

extension VoltraUIComponent {
    /// Generic type-safe parameter accessor
    /// - Parameter type: The parameter struct type to decode
    /// - Returns: Decoded parameters, or nil if decoding fails or no parameters exist
    public func parameters<T: ComponentParameters>(_ type: T.Type) -> T? {
        guard let raw = parametersRaw else { return nil }
        do {
            // Convert AnyCodable dictionary to Data
            let dict = raw.mapValues { $0.toAny() }
            let data = try JSONSerialization.data(withJSONObject: dict, options: [])
            return try JSONDecoder().decode(T.self, from: data)
        } catch {
            return nil
        }
    }
`

  // Generate convenience accessors for each component with parameters
  const accessors = components
    .filter((c) => Object.keys(c.parameters).length > 0)
    .map((component) => {
      const varName = component.name.charAt(0).toLowerCase() + component.name.slice(1) + 'Parameters'
      return `
    /// Convenience accessor for ${component.name} parameters
    public var ${varName}: ${component.name}Parameters? {
        guard type == "${component.name}" else { return nil }
        return parameters(${component.name}Parameters.self)
    }`
    })
    .join('\n')

  const footer = '\n}\n'

  return header + accessors + footer
}

export const generateSwiftParameters = (data: ComponentsData): GeneratedFiles => {
  const files: GeneratedFiles = {}

  // Generate protocol
  files['ComponentParameters.swift'] = generateProtocol(data.version)

  // Generate parameter structs for each component
  for (const component of data.components) {
    if (Object.keys(component.parameters).length > 0) {
      const content = generateParameterStruct(component, data.version)
      if (content) {
        files[`${component.name}Parameters.swift`] = content
      }
    }
  }

  // Generate VoltraUIComponent extension
  files['VoltraUIComponent+Parameters.swift'] = generateComponentExtension(data.components, data.version)

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
