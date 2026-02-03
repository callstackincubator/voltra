import type { ComponentDefinition, ComponentParameter, ComponentsData } from '../types'

type GeneratedFiles = {
  [filename: string]: string
}

const toKotlinType = (param: ComponentParameter): string => {
  if (param.type === 'component') {
    return 'Any' // Component props are handled separately
  } else if (param.enum && param.enum.length > 0) {
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
        return 'Boolean'
      case 'object':
      case 'array':
        return 'String' // JSON-encoded
      default:
        return 'String'
    }
  }
}

const generateParameterClass = (component: ComponentDefinition, version: string): string => {
  const params = Object.entries(component.parameters)

  const header = `//
//  ${component.name}Parameters.kt
//
//  AUTO-GENERATED from data/components.json
//  DO NOT EDIT MANUALLY - Changes will be overwritten
//  Schema version: ${version}

package voltra.models.parameters

import kotlinx.serialization.Serializable

/**
 * Parameters for ${component.name} component
 * ${component.description}
 */
@Serializable
data class ${component.name}Parameters(
`

  let properties = params
    .map(([name, param]) => {
      const kotlinType = toKotlinType(param)
      const isOptional = param.optional || param.default !== undefined
      const typeDeclaration = isOptional ? `${kotlinType}? = null` : kotlinType

      let line = `    val ${name}: ${typeDeclaration}`
      if (param.description) {
        line = `    /** ${param.description} */\n` + line
      }
      return line
    })
    .join(',\n\n')

  // If no parameters, add a dummy Unit parameter to satisfy Kotlin data class requirements
  if (params.length === 0) {
    properties = `    /** Dummy parameter to satisfy data class requirements */
    val _dummy: Unit = Unit`
  }

  const footer = '\n)\n'

  return header + properties + footer
}

export const generateKotlinParameters = (data: ComponentsData): GeneratedFiles => {
  const files: GeneratedFiles = {}

  for (const component of data.components) {
    // Only generate for Android-available components
    if (component.androidAvailability) {
      const content = generateParameterClass(component, data.version)
      files[`${component.name}Parameters.kt`] = content
    }
  }

  return files
}
