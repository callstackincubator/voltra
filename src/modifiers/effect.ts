// 🤖 AUTO-GENERATED from data/modifiers.json
// DO NOT EDIT MANUALLY - Changes will be overwritten
// Schema version: 1.0.0

import type { Modifier } from './types'
/**
 * Applies a shadow to the view
 * @availability iOS 13.0
 */
export type ShadowModifier = Modifier<
  'shadow',
  {
    /** Shadow color */
    color?: string
    /** Shadow opacity */
    opacity?: number
    /** Shadow blur radius */
    radius?: number
    /** Horizontal shadow offset */
    x?: number
    /** Vertical shadow offset */
    y?: number
  }
>

/**
 * Scales the view
 * @availability iOS 13.0
 */
export type ScaleEffectModifier = Modifier<
  'scaleEffect',
  {
    /** Uniform scale factor */
    value: number
  } | {
    /** Horizontal scale factor */
    x?: number
    /** Vertical scale factor */
    y?: number
  }
>

/**
 * Rotates the view
 * @availability iOS 13.0
 */
export type RotationEffectModifier = Modifier<
  'rotationEffect',
  {
    /** Rotation angle in degrees */
    degrees: number
  }
>

/**
 * Adds a border to the view
 * @availability iOS 13.0
 */
export type BorderModifier = Modifier<
  'border',
  {
    /** Border width */
    width?: number
    /** Border color */
    color?: string
    /** Corner radius for the border */
    cornerRadius?: number
  }
>

/**
 * Clips the view to its bounds
 * @availability iOS 13.0
 */
export type ClippedModifier = Modifier<
  'clipped',
  {
    /** Whether clipping is enabled */
    enabled?: boolean
  }
>

/**
 * Applies iOS 26+ Liquid Glass effect
 * @availability iOS 26.0
 */
export type GlassEffectModifier = Modifier<
  'glassEffect',
  {
    /** Whether the effect is enabled */
    enabled?: boolean
    /** Shape to clip the glass effect to */
    shape?: 'rect' | 'roundedRect' | 'capsule' | 'circle'
    /** Corner radius for rect/roundedRect shapes */
    cornerRadius?: number
  }
>
export type EffectModifiers =
  | ShadowModifier
  | ScaleEffectModifier
  | RotationEffectModifier
  | BorderModifier
  | ClippedModifier
  | GlassEffectModifier
