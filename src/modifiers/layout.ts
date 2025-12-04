// 🤖 AUTO-GENERATED from data/modifiers.json
// DO NOT EDIT MANUALLY - Changes will be overwritten
// Schema version: 1.0.0

import type { Modifier } from './types'
/**
 * Sets the frame dimensions of the view
 * @availability iOS 13.0, macOS 10.15, tvOS 13.0, watchOS 6.0
 */
export type FrameModifier = Modifier<
  'frame',
  {
    /** Fixed width */
    width?: number
    /** Fixed height */
    height?: number
    /** Maximum width constraint (use 'infinity' for flexible width) */
    maxWidth?: 'infinity'
    /** Maximum height constraint (use 'infinity' for flexible height) */
    maxHeight?: 'infinity'
    /** Minimum width constraint */
    minWidth?: number
    /** Minimum height constraint */
    minHeight?: number
    /** Preferred/ideal width (used as preferred size in flexible layouts) */
    idealWidth?: number
    /** Preferred/ideal height (used as preferred size in flexible layouts) */
    idealHeight?: number
  }
>

/**
 * Adds padding around the view
 * @availability iOS 13.0, macOS 10.15, tvOS 13.0, watchOS 6.0
 */
export type PaddingModifier = Modifier<
  'padding',
  {
    /** Uniform padding on all edges */
    all?: number
    /** Padding on top edge */
    top?: number
    /** Padding on bottom edge */
    bottom?: number
    /** Padding on leading edge */
    leading?: number
    /** Padding on trailing edge */
    trailing?: number
  }
>

/**
 * Offsets the view by the specified x and y values
 * @availability iOS 13.0
 */
export type OffsetModifier = Modifier<
  'offset',
  {
    /** Horizontal offset */
    x?: number
    /** Vertical offset */
    y?: number
  }
>
export type LayoutModifiers =
  | FrameModifier
  | PaddingModifier
  | OffsetModifier
