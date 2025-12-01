import type { ComponentDefinition, ComponentParameter, ComponentsData } from '../types'

type GeneratedFiles = {
  [filename: string]: string
}

const toTSType = (param: ComponentParameter): string => {
  let baseType: string
  if (param.enum && param.enum.length > 0) {
    baseType = param.enum.map((v) => `'${v}'`).join(' | ')
  } else if (param.jsonEncoded) {
    // JSON-encoded parameters are stored as strings in JSON but might be objects in props
    baseType = param.type === 'object' ? 'Record<string, any>' : 'string'
  } else {
    baseType = param.type
  }
  return baseType
}

const generatePropsType = (component: ComponentDefinition): string => {
  const params = Object.entries(component.parameters)

  if (params.length === 0) {
    return `export type ${component.name}Props = VoltraBaseProps`
  }

  const properties = params.map(([name, param]) => {
    const optional = param.optional ? '?' : ''
    const description = param.description ? `\n  /** ${param.description} */` : ''
    return `${description}\n  ${name}${optional}: ${toTSType(param)}`
  })

  return `export type ${component.name}Props = VoltraBaseProps & {${properties.join('')}
}`
}

const generatePropsTypeFile = (component: ComponentDefinition, version: string): string => {
  const header = `// 🤖 AUTO-GENERATED from data/components.json
// DO NOT EDIT MANUALLY - Changes will be overwritten
// Schema version: ${version}

import type { VoltraBaseProps } from '../baseProps'

`

  const propsType = generatePropsType(component)

  return header + propsType + '\n'
}

export const generateTypeScriptJSX = (data: ComponentsData): { props: GeneratedFiles; jsx: GeneratedFiles } => {
  const propsFiles: GeneratedFiles = {}
  const jsxFiles: GeneratedFiles = {}

  // Generate individual props type files
  for (const component of data.components) {
    const filename = `${component.name}.ts`
    propsFiles[filename] = generatePropsTypeFile(component, data.version)
  }

  // Generate marker file
  propsFiles['.generated'] = `This directory contains auto-generated component props type files.
DO NOT EDIT MANUALLY.

Generated from: data/components.json
Schema version: ${data.version}

To regenerate these files, run:
  npm run generate

Users should create component files manually using createVoltraComponent with these types.
Example:
  import { createVoltraComponent } from './internal/voltraComponent'
  import type { ButtonProps } from './props/Button'

  export const Button = createVoltraComponent<ButtonProps>('Button')
`

  return { props: propsFiles, jsx: jsxFiles }
}
