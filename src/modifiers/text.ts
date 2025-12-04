// 🤖 AUTO-GENERATED from data/modifiers.json
// DO NOT EDIT MANUALLY - Changes will be overwritten
// Schema version: 1.0.0

import type { Modifier } from './types'
/**
 * Sets the font of text
 * @availability iOS 13.0, macOS 10.15, tvOS 13.0, watchOS 6.0
 */
export type FontModifier = Modifier<
  'font',
  {
    /** Font size */
    size: number
    /** Font weight (e.g., 'bold', 'regular') */
    weight?: string
    /** Apply small caps styling (iOS 14+) */
    smallCaps?: boolean
    /** Apply monospaced digits (iOS 15+) */
    monospacedDigit?: boolean
  }
>

/**
 * Sets the font weight
 * @availability iOS 16.0, macOS 13.0, tvOS 16.0, watchOS 9.0
 */
export type FontWeightModifier = Modifier<
  'fontWeight',
  {
    /** Font weight (e.g., 'bold', 'semibold', 'regular') */
    weight: string
  }
>

/**
 * Applies italic styling to text
 * @availability iOS 13.0, macOS 10.15, tvOS 13.0, watchOS 6.0
 */
export type ItalicModifier = Modifier<
  'italic',
  {
    /** Whether italic is enabled */
    enabled?: boolean
  }
>

/**
 * Applies small caps styling to text
 * @availability iOS 14.0, macOS 11.0, tvOS 14.0, watchOS 7.0
 */
export type SmallCapsModifier = Modifier<
  'smallCaps',
  {
    /** Whether small caps is enabled */
    enabled?: boolean
  }
>

/**
 * Applies monospaced digit styling to text
 * @availability iOS 15.0, macOS 12.0, tvOS 15.0, watchOS 8.0
 */
export type MonospacedDigitModifier = Modifier<
  'monospacedDigit',
  {
    /** Whether monospaced digits are enabled */
    enabled?: boolean
  }
>

/**
 * Limits the number of lines of text
 * @availability iOS 13.0
 */
export type LineLimitModifier = Modifier<
  'lineLimit',
  {
    /** Maximum number of lines */
    value: number
  }
>

/**
 * Sets the spacing between lines of text
 * @availability iOS 13.0
 */
export type LineSpacingModifier = Modifier<
  'lineSpacing',
  {
    /** Line spacing value */
    value: number
  }
>

/**
 * Sets the spacing between characters
 * @availability iOS 13.0
 */
export type KerningModifier = Modifier<
  'kerning',
  {
    /** Kerning value */
    value: number
  }
>

/**
 * Sets text alignment for multiline text
 * @availability iOS 13.0
 */
export type MultilineTextAlignmentModifier = Modifier<
  'multilineTextAlignment',
  {
    /** Text alignment */
    value: 'leading' | 'center' | 'right'
  }
>

/**
 * Applies underline to text
 * @availability iOS 13.0
 */
export type UnderlineModifier = Modifier<
  'underline',
  {
    /** Whether underline is enabled */
    enabled?: boolean
    /** Underline color */
    color?: string
  }
>

/**
 * Applies strikethrough to text
 * @availability iOS 13.0
 */
export type StrikethroughModifier = Modifier<
  'strikethrough',
  {
    /** Whether strikethrough is enabled */
    enabled?: boolean
    /** Strikethrough color */
    color?: string
  }
>
export type TextModifiers =
  | FontModifier
  | FontWeightModifier
  | ItalicModifier
  | SmallCapsModifier
  | MonospacedDigitModifier
  | LineLimitModifier
  | LineSpacingModifier
  | KerningModifier
  | MultilineTextAlignmentModifier
  | UnderlineModifier
  | StrikethroughModifier
