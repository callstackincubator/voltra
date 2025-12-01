// 🤖 AUTO-GENERATED from data/modifiers.json
// DO NOT EDIT MANUALLY - Changes will be overwritten
// Schema version: 1.0.0

import type { Modifier } from './types'
/**
 * Sets the foreground color of the view
 * @availability iOS 15.0, macOS 12.0, tvOS 15.0, watchOS 8.0
 */
export type ForegroundStyleModifier = Modifier<
  'foregroundStyle',
  {
    /** Color name or hex value */
    color: string
  }
>

/**
 * Sets the background color of the view
 * @availability iOS 16.0, macOS 13.0, tvOS 16.0, watchOS 9.0
 */
export type BackgroundModifier = Modifier<
  'background',
  {
    /** Color name or hex value */
    color: string
  }
>

/**
 * Sets the background style of the view (alias for background)
 * @availability iOS 16.0, macOS 13.0, tvOS 16.0, watchOS 9.0
 */
export type BackgroundStyleModifier = Modifier<
  'backgroundStyle',
  {
    /** Color name or hex value */
    color: string
  }
>

/**
 * Sets the tint color of the view
 * @availability iOS 15.0, macOS 12.0, tvOS 15.0, watchOS 8.0
 */
export type TintModifier = Modifier<
  'tint',
  {
    /** Color name or hex value */
    color: string
  }
>

/**
 * Sets the opacity of the view
 * @availability iOS 13.0, macOS 10.15, tvOS 13.0, watchOS 6.0
 */
export type OpacityModifier = Modifier<
  'opacity',
  {
    /** Opacity value between 0 and 1 */
    value: number
  }
>

/**
 * Applies corner radius to the view
 * @availability iOS 13.0, macOS 10.15, tvOS 13.0, watchOS 6.0
 */
export type CornerRadiusModifier = Modifier<
  'cornerRadius',
  {
    /** Corner radius value */
    radius: number
  }
>
export type StyleModifiers =
  | ForegroundStyleModifier
  | BackgroundModifier
  | BackgroundStyleModifier
  | TintModifier
  | OpacityModifier
  | CornerRadiusModifier
