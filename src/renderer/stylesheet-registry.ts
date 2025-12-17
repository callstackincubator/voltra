import { StyleSheet } from 'react-native'

import { shorten } from '../payload/short-names'

function compressStyleObject(style: any): any {
  if (style === null || style === undefined) {
    return style
  }

  // Flatten style if it's a StyleSheet reference or array
  const flattened = StyleSheet.flatten(style)

  const compressed: Record<string, any> = {}

  for (const [key, value] of Object.entries(flattened)) {
    const shortKey = shorten(key)

    if (value === null || value === undefined) {
      continue
    }

    // Handle nested objects (e.g., shadowOffset: { width, height })
    if (typeof value === 'object' && !Array.isArray(value) && value.constructor === Object) {
      const compressedNested: Record<string, any> = {}
      for (const [nestedKey, nestedValue] of Object.entries(value)) {
        compressedNested[nestedKey] = nestedValue
      }
      compressed[shortKey] = compressedNested
    } else {
      compressed[shortKey] = value
    }
  }

  return compressed
}

export type StylesheetRegistry = {
  registerStyle: (styleObject: object) => number
  getStyles: () => Record<string, unknown>[]
}

export const createStylesheetRegistry = (): StylesheetRegistry => {
  const styleToIndex = new Map<object, number>()
  const styles: Record<string, unknown>[] = []

  return {
    registerStyle: (styleObject: object): number => {
      const existing = styleToIndex.get(styleObject)
      if (existing !== undefined) return existing

      const index = styles.length
      styleToIndex.set(styleObject, index)
      styles.push(compressStyleObject(styleObject))
      return index
    },
    getStyles: () => styles,
  }
}
