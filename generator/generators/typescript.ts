import type { ModifierArgument, ModifierDefinition, ModifiersData } from '../types'

type GeneratedFiles = {
  [filename: string]: string
}

const toTSType = (arg: ModifierArgument): string => {
  let baseType: string
  if (arg.enum && arg.enum.length > 0) {
    baseType = arg.enum.map((v) => `'${v}'`).join(' | ')
  } else {
    baseType = arg.type
  }
  return baseType
}

const generateArgType = (args: Record<string, ModifierArgument>): string => {
  const props = Object.entries(args).map(([name, arg]) => {
    const optional = arg.optional ? '?' : ''
    const description = arg.description ? `/** ${arg.description} */\n    ` : ''
    return `    ${description}${name}${optional}: ${toTSType(arg)}`
  })

  return `{\n${props.join('\n')}\n  }`
}

const capitalize = (str: string): string => {
  return str.charAt(0).toUpperCase() + str.slice(1)
}

const generateModifierType = (modifier: ModifierDefinition): string => {
  const { name, description, swiftAvailability } = modifier
  const availability = swiftAvailability ? `\n * @availability ${swiftAvailability}` : ''

  if (modifier.argsUnion) {
    // Handle union types (like scaleEffect)
    const unionTypes = modifier.argsUnion.map((args) => generateArgType(args)).join(' | ')

    return `/**
 * ${description}${availability}
 */
export type ${capitalize(name)}Modifier = Modifier<
  '${name}',
  ${unionTypes}
>`
  }

  if (modifier.args) {
    const argsType = generateArgType(modifier.args)
    return `/**
 * ${description}${availability}
 */
export type ${capitalize(name)}Modifier = Modifier<
  '${name}',
  ${argsType}
>`
  }

  // Fallback for modifiers without args (shouldn't happen)
  return `/**
 * ${description}${availability}
 */
export type ${capitalize(name)}Modifier = Modifier<'${name}', {}>`
}

const generateCategoryFile = (category: string, modifiers: ModifierDefinition[], version: string): string => {
  const categoryModifiers = modifiers.filter((m) => m.category === category)

  const imports = `import type { Modifier } from './types'`

  const header = `// 🤖 AUTO-GENERATED from data/modifiers.json
// DO NOT EDIT MANUALLY - Changes will be overwritten
// Schema version: ${version}

${imports}
`

  const types = categoryModifiers.map((m) => generateModifierType(m)).join('\n\n')

  const unionName = `${capitalize(category)}Modifiers`
  const unionMembers = categoryModifiers.map((m) => `${capitalize(m.name)}Modifier`).join('\n  | ')
  const unionType = `\nexport type ${unionName} =\n  | ${unionMembers}\n`

  return header + types + unionType
}

const generateTypesFile = (version: string): string => {
  return `// 🤖 AUTO-GENERATED from data/modifiers.json
// DO NOT EDIT MANUALLY - Changes will be overwritten
// Schema version: ${version}

export type Modifier<TName extends string = string, TArgs extends Record<string, unknown> = Record<string, unknown>> = {
  name: TName
  args: TArgs
}
`
}

const generateIndexFile = (categories: string[], modifiers: ModifierDefinition[], version: string): string => {
  const imports = categories.map((cat) => `import type { ${capitalize(cat)}Modifiers } from './${cat}'`).join('\n')

  const reExports = categories.map((cat) => `export type { ${capitalize(cat)}Modifiers } from './${cat}'`).join('\n')

  const individualExports = modifiers
    .map((m) => `export type { ${capitalize(m.name)}Modifier } from './${m.category}'`)
    .join('\n')

  const union = categories.map((cat) => `${capitalize(cat)}Modifiers`).join(' | ')

  return `// 🤖 AUTO-GENERATED from data/modifiers.json
// DO NOT EDIT MANUALLY - Changes will be overwritten
// Schema version: ${version}

${imports}

export type { Modifier } from './types'

${reExports}

${individualExports}

export type VoltraModifier = ${union}
`
}

export const generateTypeScriptTypes = (data: ModifiersData): GeneratedFiles => {
  const categories = ['layout', 'style', 'text', 'effect', 'gauge']

  const files: GeneratedFiles = {}

  // Generate types.ts
  files['types.ts'] = generateTypesFile(data.version)

  // Generate category files
  for (const category of categories) {
    files[`${category}.ts`] = generateCategoryFile(category, data.modifiers, data.version)
  }

  // Generate index.ts
  files['index.ts'] = generateIndexFile(categories, data.modifiers, data.version)

  // Generate marker file
  files['.generated'] = `This directory contains auto-generated files.
DO NOT EDIT MANUALLY.

Generated from: data/modifiers.json
Schema version: ${data.version}

To regenerate these files, run:
  npm run generate
`

  return files
}
