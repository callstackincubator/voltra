import { serializeStyleObject } from '../resolvable/serialize.js'

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
      styles.push(serializeStyleObject(styleObject) as Record<string, unknown>)
      return index
    },
    getStyles: () => styles,
  }
}
