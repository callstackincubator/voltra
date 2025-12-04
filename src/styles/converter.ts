import { ColorValue, I18nManager, StyleSheet } from 'react-native'

import type { FrameModifier } from '../modifiers'
import { VoltraModifier } from '../modifiers'
import type { VoltraStyleProp, VoltraViewStyle } from './types'

const colorToString = (color: ColorValue): string => {
  if (typeof color === 'string') return color
  if (typeof color === 'number') return `#${(color as number).toString(16).padStart(6, '0')}`

  throw new Error(`Unsupported color value: ${String(color)}`)
}

const SUPPORTED_KEYS: (keyof VoltraViewStyle)[] = [
  'width',
  'height',
  'padding',
  'paddingTop',
  'paddingBottom',
  'paddingLeft',
  'paddingRight',
  'paddingHorizontal',
  'paddingVertical',
  'backgroundColor',
  'opacity',
  'borderRadius',
  'borderWidth',
  'borderColor',
  'shadowColor',
  'shadowOffset',
  'shadowOpacity',
  'shadowRadius',
  'overflow',
]

export const getModifiersFromStyle = (style: VoltraStyleProp): VoltraModifier[] => {
  const flattenedStyle = StyleSheet.flatten(style)
  const modifiers: VoltraModifier[] = []

  // Group related properties
  const paddingProps: Record<string, number> = {}
  const borderProps: Record<string, any> = {}
  const shadowProps: Record<string, any> = {}
  let backgroundColor: ColorValue | undefined = undefined

  // Process all supported properties

  for (const key of SUPPORTED_KEYS) {
    const value = flattenedStyle[key]

    if (value === undefined) continue

    switch (key) {
      // Layout properties
      case 'width':
        if (typeof value === 'number') {
          const existingFrame = modifiers.find((m) => m.name === 'frame') as FrameModifier
          if (existingFrame) {
            existingFrame.args.width = value
          } else {
            modifiers.push({
              name: 'frame',
              args: { width: value },
            })
          }
        }
        // Skip percentages and 'auto'
        break

      case 'height':
        if (typeof value === 'number') {
          const existingFrame = modifiers.find((m) => m.name === 'frame') as FrameModifier
          if (existingFrame) {
            existingFrame.args.height = value
          } else {
            modifiers.push({
              name: 'frame',
              args: { height: value },
            })
          }
        }
        // Skip percentages and 'auto'
        break

      // Padding properties - collect all for grouping
      case 'padding':
      case 'paddingTop':
      case 'paddingBottom':
      case 'paddingLeft':
      case 'paddingRight':
      case 'paddingHorizontal':
      case 'paddingVertical':
        if (typeof value === 'number') {
          paddingProps[key] = value
        }
        break

      // Style properties - collect backgroundColor to add after padding
      case 'backgroundColor':
        if (value !== undefined) {
          backgroundColor = value as ColorValue
        }
        break

      case 'opacity':
        if (typeof value === 'number') {
          modifiers.push({
            name: 'opacity',
            args: { value },
          })
        }
        break

      case 'borderRadius':
        // Will handle in border grouping or as separate cornerRadius
        borderProps.borderRadius = value
        break

      // Border properties - collect for grouping
      case 'borderWidth':
        borderProps.borderWidth = value
        break

      case 'borderColor':
        borderProps.borderColor = value
        break

      // Shadow properties - collect for grouping
      case 'shadowColor':
        shadowProps.shadowColor = value
        break

      case 'shadowOffset':
        shadowProps.shadowOffset = value
        break

      case 'shadowOpacity':
        shadowProps.shadowOpacity = value
        break

      case 'shadowRadius':
        shadowProps.shadowRadius = value
        break

      // Effect properties
      case 'overflow':
        if (value === 'hidden') {
          modifiers.push({
            name: 'clipped',
            args: { enabled: true },
          })
        }
        break

      // Ignore unsupported properties
      default:
        break
    }
  }

  // Process grouped properties in correct order for SwiftUI
  // Order matters: padding → background → cornerRadius → border → shadow

  // 1. Create padding modifier (must come first so background fills the padded area)
  if (Object.keys(paddingProps).length > 0) {
    const paddingArgs: Record<string, number> = {}

    // Handle uniform padding
    if (paddingProps.padding !== undefined) {
      paddingArgs.all = paddingProps.padding
    } else {
      // Handle individual edges with proper priority
      if (paddingProps.paddingTop !== undefined) {
        paddingArgs.top = paddingProps.paddingTop
      }
      if (paddingProps.paddingBottom !== undefined) {
        paddingArgs.bottom = paddingProps.paddingBottom
      }

      // RTL-aware padding direction
      const isRTL = I18nManager.isRTL
      if (paddingProps.paddingLeft !== undefined) {
        paddingArgs[isRTL ? 'trailing' : 'leading'] = paddingProps.paddingLeft
      }
      if (paddingProps.paddingRight !== undefined) {
        paddingArgs[isRTL ? 'leading' : 'trailing'] = paddingProps.paddingRight
      }

      // Handle horizontal/vertical (lower priority)
      if (paddingProps.paddingHorizontal !== undefined && !paddingArgs.leading && !paddingArgs.trailing) {
        paddingArgs.leading = paddingProps.paddingHorizontal
        paddingArgs.trailing = paddingProps.paddingHorizontal
      }
      if (paddingProps.paddingVertical !== undefined && !paddingArgs.top && !paddingArgs.bottom) {
        paddingArgs.top = paddingProps.paddingVertical
        paddingArgs.bottom = paddingProps.paddingVertical
      }
    }

    if (Object.keys(paddingArgs).length > 0) {
      modifiers.push({
        name: 'padding',
        args: paddingArgs,
      })
    }
  }

  // 2. Add background modifier (after padding so it fills the padded area)
  if (backgroundColor !== undefined) {
    modifiers.push({
      name: 'background',
      args: { color: colorToString(backgroundColor) },
    })
  }

  // 3. Handle borderRadius - add as cornerRadius if no border, otherwise include in border modifier
  const hasBorderWidth =
    borderProps.borderWidth !== undefined && typeof borderProps.borderWidth === 'number' && borderProps.borderWidth > 0
  const hasBorderColor = borderProps.borderColor !== undefined
  const hasBorder = hasBorderWidth || hasBorderColor
  if (borderProps.borderRadius !== undefined && typeof borderProps.borderRadius === 'number') {
    if (!hasBorder) {
      // Add as separate cornerRadius modifier when there's no border
      modifiers.push({
        name: 'cornerRadius',
        args: { radius: borderProps.borderRadius },
      })
    }
  }

  // 4. Create border modifier (includes borderRadius if border exists)
  if (hasBorder) {
    const borderArgs: Record<string, any> = {}

    if (hasBorderWidth) {
      borderArgs.width = borderProps.borderWidth
    }

    if (hasBorderColor) {
      borderArgs.color = colorToString(borderProps.borderColor as ColorValue)
    }

    if (borderProps.borderRadius !== undefined && typeof borderProps.borderRadius === 'number') {
      borderArgs.cornerRadius = borderProps.borderRadius
    }

    if (Object.keys(borderArgs).length > 0) {
      modifiers.push({
        name: 'border',
        args: borderArgs,
      })
    }
  }

  // Create shadow modifier
  if (Object.keys(shadowProps).length > 0) {
    const shadowArgs: Record<string, any> = {}

    if (shadowProps.shadowColor !== undefined) {
      shadowArgs.color = colorToString(shadowProps.shadowColor as ColorValue)
    }

    if (shadowProps.shadowOpacity !== undefined && typeof shadowProps.shadowOpacity === 'number') {
      shadowArgs.opacity = shadowProps.shadowOpacity
    }

    if (shadowProps.shadowRadius !== undefined && typeof shadowProps.shadowRadius === 'number') {
      shadowArgs.radius = shadowProps.shadowRadius
    }

    if (shadowProps.shadowOffset && typeof shadowProps.shadowOffset === 'object') {
      const offset = shadowProps.shadowOffset as { width?: number; height?: number }
      if (offset.width !== undefined) {
        shadowArgs.x = offset.width
      }
      if (offset.height !== undefined) {
        shadowArgs.y = offset.height
      }
    }

    if (Object.keys(shadowArgs).length > 0) {
      modifiers.push({
        name: 'shadow',
        args: shadowArgs,
      })
    }
  }

  return modifiers
}
