import { createIosModifier } from './createIosModifier.js'

export type { IosModifier } from './createIosModifier.js'

export type ClipShape = 'rectangle' | 'roundedRectangle' | 'circle' | 'capsule' | 'ellipse'

export type ClipShapeOptions = {
  /** Corner radius for `roundedRectangle`. */
  cornerRadius?: number
  /** Corner style for `roundedRectangle`. Defaults to `circular`. */
  cornerStyle?: 'circular' | 'continuous'
}

/**
 * Opens the URL in the app when the widget is tapped. Use it once per widget; SwiftUI keeps the
 * outermost one.
 *
 * @since iOS 14.0
 */
export const widgetURL = (url: string) => createIosModifier('widgetURL', { url })

/**
 * Redacts the view when the widget is shown on a locked device.
 *
 * @since iOS 15.0
 */
export const privacySensitive = (sensitive: boolean = true) => createIosModifier('privacySensitive', { sensitive })

/**
 * Clips the finished component, background included, to a shape.
 *
 * @since iOS 13.0
 */
export const clipShape = (shape: ClipShape, options: ClipShapeOptions = {}) =>
  createIosModifier('clipShape', { shape, ...options })
