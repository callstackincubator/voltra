// Shared types for the generator

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
