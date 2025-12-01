// Shared types for the generator

export type ModifierArgument = {
  type: 'string' | 'number' | 'boolean'
  optional: boolean
  description?: string
  default?: string | number | boolean
  enum?: string[]
}

export type ModifierDefinition = {
  name: string
  category: 'layout' | 'style' | 'text' | 'effect' | 'gauge'
  description: string
  swiftAvailability: string
  args?: Record<string, ModifierArgument>
  argsUnion?: Record<string, ModifierArgument>[]
}

export type ModifiersData = {
  version: string
  modifiers: ModifierDefinition[]
}

// Component types

export type ComponentParameter = {
  type: 'string' | 'number' | 'boolean' | 'object' | 'array'
  optional: boolean
  description?: string
  default?: string | number | boolean
  enum?: string[]
  jsonEncoded?: boolean
}

export type ComponentDefinition = {
  name: string
  description: string
  swiftAvailability: string
  hasChildren?: boolean
  parameters: Record<string, ComponentParameter>
}

export type ComponentsData = {
  version: string
  components: ComponentDefinition[]
}
