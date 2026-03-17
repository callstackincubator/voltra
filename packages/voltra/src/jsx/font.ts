export type VoltraFont = {
  readonly __voltraFontId: string
  readonly name?: string
  readonly size: number
  readonly weight?: string
  readonly family?: string
  readonly smallCaps?: boolean
  readonly monospacedDigit?: boolean
  readonly italic?: boolean
}

let fontIdCounter = 0

export function createFont(options: {
  name?: string
  size: number
  weight?: string
  family?: string
  smallCaps?: boolean
  monospacedDigit?: boolean
  italic?: boolean
}): VoltraFont {
  // Use numeric ID (0, 1, 2, ...) for smallest payload size
  const id = String(fontIdCounter++)

  return {
    __voltraFontId: id,
    name: options.name,
    size: options.size,
    weight: options.weight,
    family: options.family,
    smallCaps: options.smallCaps,
    monospacedDigit: options.monospacedDigit,
    italic: options.italic,
  }
}

export function isVoltraFont(value: unknown): value is VoltraFont {
  return (
    typeof value === 'object' &&
    value !== null &&
    '__voltraFontId' in value &&
    typeof (value as any).__voltraFontId === 'string'
  )
}
