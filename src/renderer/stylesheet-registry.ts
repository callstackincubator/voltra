import { StyleSheet } from 'react-native'

function compressStyleObject(style: any): any {
  if (style === null || style === undefined) {
    return style
  }

  // Flatten style if it's a StyleSheet reference or array
  const flattened = StyleSheet.flatten(style)

  const compressed: Record<string, any> = {}

  for (const [key, value] of Object.entries(flattened)) {
    const shortKey = shortenStylePropertyName(key)

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

// Style property name shortening map
const STYLE_PROPERTY_NAME_MAP: Record<string, string> = {
  padding: 'pad',
  paddingVertical: 'pv',
  paddingHorizontal: 'ph',
  paddingTop: 'pt',
  paddingBottom: 'pb',
  paddingLeft: 'pl',
  paddingRight: 'pr',
  margin: 'm',
  marginVertical: 'mv',
  marginHorizontal: 'mh',
  marginTop: 'mt',
  marginBottom: 'mb',
  marginLeft: 'ml',
  marginRight: 'mr',
  backgroundColor: 'bg',
  borderRadius: 'br',
  borderWidth: 'bw',
  borderColor: 'bc',
  shadowColor: 'sc',
  shadowOffset: 'so',
  shadowOpacity: 'sop',
  shadowRadius: 'sr',
  fontSize: 'fs',
  fontWeight: 'fw',
  color: 'c',
  letterSpacing: 'ls',
  fontVariant: 'fv',
  width: 'w',
  height: 'h',
  opacity: 'op',
  overflow: 'ov',
  aspectRatio: 'ar',
  minWidth: 'minw',
  maxWidth: 'maxw',
  minHeight: 'minh',
  maxHeight: 'maxh',
  flexGrowWidth: 'fgw',
  fixedSizeHorizontal: 'fsh',
  fixedSizeVertical: 'fsv',
  layoutPriority: 'lp',
  zIndex: 'zi',
  offsetX: 'ox',
  offsetY: 'oy',
  absolutePosition: 'ap',
  position: 'pos',
  top: 't',
  left: 'l',
  right: 'r',
  bottom: 'b',
}

function shortenStylePropertyName(name: string): string {
  return STYLE_PROPERTY_NAME_MAP[name] || name
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
    getStyles: () => styles
  }
}