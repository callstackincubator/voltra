import { ColorValue, I18nManager, StyleSheet } from 'react-native'

import type { FrameModifier } from '../modifiers'
import { VoltraModifier } from '../modifiers'
import type { VoltraStyleProp, VoltraTextStyle, VoltraTextStyleProp, VoltraViewStyle } from './types'

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
  'margin',
  'marginTop',
  'marginBottom',
  'marginLeft',
  'marginRight',
  'marginHorizontal',
  'marginVertical',
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
  'flex',
  'flexGrow',
  'flexShrink',
  'position',
  'top',
  'left',
  'right',
  'bottom',
]

export const getModifiersFromLayoutStyle = (style: VoltraStyleProp): VoltraModifier[] => {
  const flattenedStyle = StyleSheet.flatten(style)
  const modifiers: VoltraModifier[] = []

  // Group related properties
  const paddingProps: Record<string, number> = {}
  const marginProps: Record<string, number> = {}
  const borderProps: Record<string, any> = {}
  const shadowProps: Record<string, any> = {}
  let backgroundColor: ColorValue | undefined = undefined
  let flexGrow: number | undefined = undefined
  let flexShrink: number | undefined = undefined

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

      // Margin properties - collect all for grouping (will be converted to padding and applied last)
      case 'margin':
      case 'marginTop':
      case 'marginBottom':
      case 'marginLeft':
      case 'marginRight':
      case 'marginHorizontal':
      case 'marginVertical':
        if (typeof value === 'number') {
          marginProps[key] = value
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

      // Flex properties - collect for processing after width/height
      case 'flex':
        // Yoga's flex shorthand: positive acts as flexGrow, negative acts as flexShrink
        if (typeof value === 'number') {
          if (value > 0) {
            // Only set flexGrow if not explicitly set
            if (flexGrow === undefined) {
              flexGrow = value
            }
          } else if (value < 0) {
            // Only set flexShrink if not explicitly set
            if (flexShrink === undefined) {
              flexShrink = Math.abs(value)
            }
          }
        }
        break

      case 'flexGrow':
        if (typeof value === 'number' && value > 0) {
          flexGrow = value
        }
        break

      case 'flexShrink':
        if (typeof value === 'number' && value > 0) {
          flexShrink = value
        }
        break

      // Position properties - collect for processing after all properties
      case 'position':
      case 'top':
      case 'left':
      case 'right':
      case 'bottom':
        // Will be processed after all properties are collected
        break

      // Ignore unsupported properties
      default:
        break
    }
  }

  // Process flex properties: adjust frame modifier based on flexGrow/flexShrink
  if (flexGrow !== undefined || flexShrink !== undefined) {
    const frameModifier = modifiers.find((m) => m.name === 'frame') as FrameModifier | undefined

    if (frameModifier) {
      // If flexGrow > 0, convert width/height to idealWidth/idealHeight and set maxWidth/maxHeight to infinity
      if (flexGrow !== undefined && flexGrow > 0) {
        const hadWidth = frameModifier.args.width !== undefined
        const hadHeight = frameModifier.args.height !== undefined

        // Convert width to idealWidth if present
        if (hadWidth) {
          frameModifier.args.idealWidth = frameModifier.args.width
          delete frameModifier.args.width
          frameModifier.args.maxWidth = 'infinity'
        }
        // Convert height to idealHeight if present
        if (hadHeight) {
          frameModifier.args.idealHeight = frameModifier.args.height
          delete frameModifier.args.height
          frameModifier.args.maxHeight = 'infinity'
        }
        // If no width/height was set, still enable flexible sizing
        if (!hadWidth && frameModifier.args.idealWidth === undefined) {
          frameModifier.args.maxWidth = 'infinity'
        }
        if (!hadHeight && frameModifier.args.idealHeight === undefined) {
          frameModifier.args.maxHeight = 'infinity'
        }
      } else if (flexGrow !== undefined && flexGrow === 0) {
        // flexGrow: 0 means don't grow - explicitly remove maxWidth/maxHeight infinity constraints
        // This allows the view to size to its content instead of filling available space
        if (frameModifier.args.maxWidth === 'infinity') {
          delete frameModifier.args.maxWidth
        }
        if (frameModifier.args.maxHeight === 'infinity') {
          delete frameModifier.args.maxHeight
        }
      }

      // If flexShrink > 0 (or flexGrow > 0, which implies shrink), ensure minWidth/minHeight is 0
      if ((flexShrink !== undefined && flexShrink > 0) || (flexGrow !== undefined && flexGrow > 0)) {
        // minWidth/minHeight default to 0 in SwiftUI, but we can explicitly set them for clarity
        if (frameModifier.args.minWidth === undefined) {
          frameModifier.args.minWidth = 0
        }
        if (frameModifier.args.minHeight === undefined) {
          frameModifier.args.minHeight = 0
        }
      }
    } else if (flexGrow !== undefined && flexGrow > 0) {
      // No frame modifier exists yet, create one with flexible sizing
      modifiers.push({
        name: 'frame',
        args: {
          maxWidth: 'infinity',
          maxHeight: 'infinity',
          minWidth: 0,
          minHeight: 0,
        },
      })
    } else if ((flexShrink !== undefined && flexShrink > 0) || (flexGrow !== undefined && flexGrow === 0)) {
      // No frame modifier exists yet, create one with shrink enabled (minWidth/minHeight = 0)
      // Don't set maxWidth/maxHeight to infinity as that would prevent shrinking
      // Also handle flexGrow: 0 case - don't allow growing
      const frameArgs: FrameModifier['args'] = {
        minWidth: 0,
        minHeight: 0,
      }
      modifiers.push({
        name: 'frame',
        args: frameArgs,
      })
    }
  }

  // Handle absolute and relative positioning
  const positionValue = flattenedStyle.position
  if (positionValue === 'absolute' || positionValue === 'relative') {
    const top = flattenedStyle.top as number | undefined
    const left = flattenedStyle.left as number | undefined

    if (positionValue === 'absolute') {
      // Convert top/left to position modifier (center-based)
      // Note: SwiftUI positions center, not top-left, so user needs to account for view size
      if (top !== undefined && left !== undefined) {
        modifiers.push({
          name: 'position',
          args: {
            x: left,
            y: top,
          },
        })
      }
      // Note: right/bottom not supported in this simple implementation
    } else if (positionValue === 'relative') {
      // Convert top/left to offset modifier (relative positioning)
      // offset already exists, so check if we need to add or update it
      const existingOffset = modifiers.find((m) => m.name === 'offset') as
        | { name: string; args: { x?: number; y?: number } }
        | undefined

      if (existingOffset) {
        // Update existing offset
        if (left !== undefined) {
          existingOffset.args.x = (existingOffset.args.x ?? 0) + left
        }
        if (top !== undefined) {
          existingOffset.args.y = (existingOffset.args.y ?? 0) + top
        }
      } else {
        // Create new offset modifier
        const offsetArgs: { x?: number; y?: number } = {}
        if (left !== undefined) offsetArgs.x = left
        if (top !== undefined) offsetArgs.y = top

        if (Object.keys(offsetArgs).length > 0) {
          modifiers.push({
            name: 'offset',
            args: offsetArgs,
          })
        }
      }
    }
  }

  // Process grouped properties in correct order for SwiftUI
  // Order matters: padding → background → cornerRadius → border → shadow → margin (as padding, applied last)

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

  // 6. Create padding modifier from margins (applied last to create space outside the element)
  if (Object.keys(marginProps).length > 0) {
    const marginPaddingArgs: Record<string, number> = {}

    // Handle uniform margin
    if (marginProps.margin !== undefined) {
      marginPaddingArgs.all = marginProps.margin
    } else {
      // Handle individual edges with proper priority
      if (marginProps.marginTop !== undefined) {
        marginPaddingArgs.top = marginProps.marginTop
      }
      if (marginProps.marginBottom !== undefined) {
        marginPaddingArgs.bottom = marginProps.marginBottom
      }

      // RTL-aware margin direction
      const isRTL = I18nManager.isRTL
      if (marginProps.marginLeft !== undefined) {
        marginPaddingArgs[isRTL ? 'trailing' : 'leading'] = marginProps.marginLeft
      }
      if (marginProps.marginRight !== undefined) {
        marginPaddingArgs[isRTL ? 'leading' : 'trailing'] = marginProps.marginRight
      }

      // Handle horizontal/vertical (lower priority)
      if (marginProps.marginHorizontal !== undefined && !marginPaddingArgs.leading && !marginPaddingArgs.trailing) {
        marginPaddingArgs.leading = marginProps.marginHorizontal
        marginPaddingArgs.trailing = marginProps.marginHorizontal
      }
      if (marginProps.marginVertical !== undefined && !marginPaddingArgs.top && !marginPaddingArgs.bottom) {
        marginPaddingArgs.top = marginProps.marginVertical
        marginPaddingArgs.bottom = marginProps.marginVertical
      }
    }

    if (Object.keys(marginPaddingArgs).length > 0) {
      modifiers.push({
        name: 'padding',
        args: marginPaddingArgs,
      })
    }
  }

  return modifiers
}

const TEXT_STYLE_KEYS: (keyof Pick<
  VoltraTextStyle,
  'fontSize' | 'fontWeight' | 'color' | 'letterSpacing' | 'fontVariant'
>)[] = ['fontSize', 'fontWeight', 'color', 'letterSpacing', 'fontVariant']

export const getModifiersFromTextStyle = (style: VoltraTextStyleProp): VoltraModifier[] => {
  // First get all layout style modifiers
  const modifiers = getModifiersFromLayoutStyle(style)
  const flattenedStyle = StyleSheet.flatten(style)

  // Process text-specific properties
  let fontSize: number | undefined = undefined
  let fontWeight: string | undefined = undefined
  let color: ColorValue | undefined = undefined
  let letterSpacing: number | undefined = undefined
  let fontVariant: string[] | undefined = undefined

  for (const key of TEXT_STYLE_KEYS) {
    const value = flattenedStyle[key]
    if (value === undefined) continue

    switch (key) {
      case 'fontSize':
        if (typeof value === 'number') {
          fontSize = value
        }
        break

      case 'fontWeight':
        if (typeof value === 'string') {
          fontWeight = value
        }
        break

      case 'color':
        if (value !== undefined) {
          color = value as ColorValue
        }
        break

      case 'letterSpacing':
        if (typeof value === 'number') {
          letterSpacing = value
        }
        break

      case 'fontVariant':
        if (Array.isArray(value)) {
          fontVariant = value
        }
        break
    }
  }

  // Add text modifiers in correct order
  // Text modifiers should be applied early (before other modifiers) so they affect the text content

  // Process font variants to extract supported ones
  let hasSmallCaps = false
  let hasMonospacedDigit = false
  if (fontVariant !== undefined && Array.isArray(fontVariant)) {
    for (const variant of fontVariant) {
      if (variant === 'small-caps') {
        hasSmallCaps = true
      } else if (variant === 'tabular-nums') {
        hasMonospacedDigit = true
      }
      // Ignore unsupported variants silently
    }
  }

  // 1. Font modifier (combines fontSize, fontWeight, and font variants if present)
  if (fontSize !== undefined || hasSmallCaps || hasMonospacedDigit) {
    // Use fontSize if provided, otherwise default to system font size (17)
    const fontArgs: {
      size: number
      weight?: string
      smallCaps?: boolean
      monospacedDigit?: boolean
    } = { size: fontSize ?? 17 }

    if (fontWeight !== undefined) {
      fontArgs.weight = fontWeight
    }

    // Include font variants in the font modifier
    if (hasSmallCaps) {
      fontArgs.smallCaps = true
    }
    if (hasMonospacedDigit) {
      fontArgs.monospacedDigit = true
    }

    modifiers.unshift({
      name: 'font',
      args: fontArgs,
    })
  } else if (fontWeight !== undefined) {
    // Only fontWeight, use fontWeight modifier (iOS 16+)
    modifiers.unshift({
      name: 'fontWeight',
      args: { weight: fontWeight },
    })
  }

  // 2. Foreground style (text color) - should be applied early
  if (color !== undefined) {
    modifiers.unshift({
      name: 'foregroundStyle',
      args: { color: colorToString(color) },
    })
  }

  // 3. Kerning (letter spacing) - should be applied early to affect text rendering
  if (letterSpacing !== undefined) {
    modifiers.unshift({
      name: 'kerning',
      args: { value: letterSpacing },
    })
  }

  return modifiers
}
