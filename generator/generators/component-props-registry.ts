import type { ComponentsData } from '../types'

type GeneratedFiles = {
  [filename: string]: string
}

const generateComponentPropsRegistry = (data: ComponentsData): string => {
  const { version } = data

  // Collect all components that have parameters with type "component"
  const componentPropRegistry: Record<string, string[]> = {}

  for (const component of data.components) {
    if (component.parameters) {
      const componentPropNames = Object.entries(component.parameters)
        .filter(([, param]) => param.type === 'component')
        .map(([propName]) => propName)

      if (componentPropNames.length > 0) {
        componentPropRegistry[component.name] = componentPropNames
      }
    }
  }

  // Generate the registry file
  const registryEntries = Object.entries(componentPropRegistry)
    .map(
      ([componentName, propNames]) =>
        `registerComponentProps('${componentName}', [${propNames.map((name) => `'${name}'`).join(', ')}])`
    )
    .join('\n')

  return `/* eslint-disable */
// 🤖 AUTO-GENERATED from data/components.json
// DO NOT EDIT MANUALLY - Changes will be overwritten
// Schema version: ${version}

import { registerComponentProps } from '../renderer/renderer'

// Register component props that can contain JSX elements
// This registry is used by the renderer to detect which props need special serialization

${registryEntries}
`
}

export const generateComponentPropsRegistryFiles = (data: ComponentsData): GeneratedFiles => {
  const files: GeneratedFiles = {}

  // Generate component props registry
  files['component-props-registry.ts'] = generateComponentPropsRegistry(data)

  return files
}
