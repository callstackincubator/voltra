import { createIosModifier } from './createIosModifier.js'

export type { IosModifier } from './createIosModifier.js'

export type ClipShape = 'rectangle' | 'roundedRectangle' | 'circle' | 'capsule' | 'ellipse'

export type ClipShapeOptions = {
  /** Corner radius for `roundedRectangle`. */
  cornerRadius?: number
  /** Corner style for `roundedRectangle` and `capsule`. Defaults to `circular`. */
  cornerStyle?: 'circular' | 'continuous'
}

export type RedactionReason = 'placeholder' | 'privacy' | 'invalidated'

export type ContentTransition = 'identity' | 'opacity' | 'interpolate' | 'numericText' | 'symbolEffect'

export type Transition = 'identity' | 'opacity' | 'scale' | 'slide' | 'push' | 'move'

export type Edge = 'top' | 'bottom' | 'leading' | 'trailing'

export type AnimationCurve =
  | 'default'
  | 'linear'
  | 'easeIn'
  | 'easeOut'
  | 'easeInOut'
  | 'spring'
  | 'bouncy'
  | 'smooth'
  | 'snappy'

export type DynamicTypeSize =
  | 'xSmall'
  | 'small'
  | 'medium'
  | 'large'
  | 'xLarge'
  | 'xxLarge'
  | 'xxxLarge'
  | 'accessibility1'
  | 'accessibility2'
  | 'accessibility3'
  | 'accessibility4'
  | 'accessibility5'

export type BlendMode =
  | 'normal'
  | 'multiply'
  | 'screen'
  | 'overlay'
  | 'darken'
  | 'lighten'
  | 'colorDodge'
  | 'colorBurn'
  | 'softLight'
  | 'hardLight'
  | 'difference'
  | 'exclusion'
  | 'hue'
  | 'saturation'
  | 'color'
  | 'luminosity'
  | 'sourceAtop'
  | 'destinationOver'
  | 'destinationOut'
  | 'plusDarker'
  | 'plusLighter'

export type SymbolEffect = 'pulse' | 'variableColor' | 'breathe' | 'rotate' | 'wiggle'

// MARK: - Widgets and Live Activities

/**
 * Opens the URL in the app when the widget is tapped. Use it once per widget. It replaces Voltra's
 * default widget link, but a `deepLinkUrl` configured for the widget takes precedence.
 *
 * @since iOS 14.0
 */
export const widgetURL = (url: string) => createIosModifier('widgetURL', { url })

/**
 * Sets the widget's container background, which the system removes in contexts such as StandBy
 * and tinted Home Screens. Use it on the widget's outermost component.
 *
 * @since iOS 17.0
 */
export const containerBackground = (color: string) => createIosModifier('containerBackground', { color })

/**
 * Adds the component to the accent group when the widget renders in accented mode.
 *
 * @since iOS 16.0
 */
export const widgetAccentable = (accentable: boolean = true) => createIosModifier('widgetAccentable', { accentable })

/**
 * Redacts the view when the widget is shown on a locked device.
 *
 * @since iOS 15.0
 */
export const privacySensitive = (sensitive: boolean = true) => createIosModifier('privacySensitive', { sensitive })

/**
 * Renders the component redacted, for example as a placeholder.
 *
 * @since iOS 14.0
 */
export const redacted = (reason: RedactionReason) => createIosModifier('redacted', { reason })

/**
 * Keeps the component visible inside a redacted container.
 *
 * @since iOS 14.0
 */
export const unredacted = () => createIosModifier('unredacted')

/**
 * Marks content that goes stale while an interactive widget performs an update.
 *
 * @since iOS 17.0
 */
export const invalidatableContent = (invalidatable: boolean = true) =>
  createIosModifier('invalidatableContent', { invalidatable })

/**
 * Tints the Live Activity's Lock Screen background. `null` uses the system default.
 *
 * @since iOS 16.1
 */
export const activityBackgroundTint = (color: string | null) => createIosModifier('activityBackgroundTint', { color })

/**
 * Sets the color of the system action button shown next to the Live Activity. `null` uses the
 * system default.
 *
 * @since iOS 16.1
 */
export const activitySystemActionForegroundColor = (color: string | null) =>
  createIosModifier('activitySystemActionForegroundColor', { color })

// MARK: - Transitions and animation

/**
 * Animates changes to the content between timeline entries or activity states.
 *
 * @since iOS 16.0. `symbolEffect` requires iOS 17.0.
 */
export const contentTransition = (transition: ContentTransition, options: { countsDown?: boolean } = {}) =>
  createIosModifier('contentTransition', { transition, countsDown: options.countsDown })

/**
 * Animates the component in and out when it is added or removed between updates.
 *
 * @since iOS 13.0. `push` requires iOS 16.0.
 */
export const transition = (transition: Transition, options: { edge?: Edge } = {}) =>
  createIosModifier('transition', { transition, edge: options.edge })

/**
 * Animates the component when `value` changes between updates.
 *
 * @since iOS 13.0. `bouncy`, `smooth` and `snappy` require iOS 17.0.
 */
export const animation = (curve: AnimationCurve, options: { value: string | number | boolean; duration?: number }) =>
  createIosModifier('animation', { curve, value: options.value, duration: options.duration })

/**
 * Plays an indefinite SF Symbol effect on `Symbol` components inside.
 *
 * @since iOS 17.0. `breathe`, `rotate` and `wiggle` require iOS 18.0.
 */
export const symbolEffect = (effect: SymbolEffect) => createIosModifier('symbolEffect', { effect })

// MARK: - Visual effects

/**
 * Clips the finished component, background included, to a shape.
 *
 * @since iOS 13.0
 */
export const clipShape = (shape: ClipShape, options: ClipShapeOptions = {}) =>
  createIosModifier('clipShape', { shape, cornerRadius: options.cornerRadius, cornerStyle: options.cornerStyle })

/**
 * Applies a Gaussian blur.
 *
 * @since iOS 13.0
 */
export const blur = (radius: number, options: { opaque?: boolean } = {}) =>
  createIosModifier('blur', { radius, opaque: options.opaque })

/** @since iOS 13.0 */
export const grayscale = (amount: number) => createIosModifier('grayscale', { amount })
/** @since iOS 13.0 */
export const saturation = (amount: number) => createIosModifier('saturation', { amount })
/** @since iOS 13.0 */
export const brightness = (amount: number) => createIosModifier('brightness', { amount })
/** @since iOS 13.0 */
export const contrast = (amount: number) => createIosModifier('contrast', { amount })

/**
 * Sets how the component composites with the content behind it.
 *
 * @since iOS 13.0
 */
export const blendMode = (mode: BlendMode) => createIosModifier('blendMode', { mode })

// MARK: - Geometry and layout

/**
 * Rotates the rendered component around its center without changing its layout.
 *
 * @since iOS 13.0
 */
export const rotationEffect = (degrees: number) => createIosModifier('rotationEffect', { degrees })

/**
 * Scales the rendered component around its center without changing its layout.
 *
 * @since iOS 13.0
 */
export const scaleEffect = (scale: number | { x?: number; y?: number }) =>
  createIosModifier('scaleEffect', typeof scale === 'number' ? { x: scale, y: scale } : { x: scale.x, y: scale.y })

/**
 * Moves the rendered component without changing its layout.
 *
 * @since iOS 13.0
 */
export const offset = (value: { x?: number; y?: number }) => createIosModifier('offset', { x: value.x, y: value.y })

/**
 * Keeps the component at its ideal size on the given axes instead of letting the parent shrink it.
 *
 * @since iOS 13.0
 */
export const fixedSize = (axes: { horizontal?: boolean; vertical?: boolean } = {}) =>
  createIosModifier('fixedSize', { horizontal: axes.horizontal, vertical: axes.vertical })

/**
 * Gives the component a larger or smaller share of space in its stack.
 *
 * @since iOS 13.0
 */
export const layoutPriority = (priority: number) => createIosModifier('layoutPriority', { priority })

/**
 * Sizes the component relative to its nearest container, such as the widget.
 *
 * @since iOS 17.0
 */
export const containerRelativeFrame = (axes: 'horizontal' | 'vertical' | 'both') =>
  createIosModifier('containerRelativeFrame', { axes })

/**
 * Caps the Dynamic Type size used by text inside the component.
 *
 * @since iOS 15.0
 */
export const dynamicTypeSize = (size: DynamicTypeSize) => createIosModifier('dynamicTypeSize', { size })

// MARK: - Text

/**
 * Lets text inside shrink down to this fraction of its font size to fit.
 *
 * @since iOS 13.0
 */
export const minimumScaleFactor = (factor: number) => createIosModifier('minimumScaleFactor', { factor })

/**
 * Sets where text inside is truncated when it does not fit.
 *
 * @since iOS 13.0
 */
export const truncationMode = (mode: 'head' | 'middle' | 'tail') => createIosModifier('truncationMode', { mode })

/**
 * Aligns the lines of multi-line text inside.
 *
 * @since iOS 13.0
 */
export const multilineTextAlignment = (alignment: 'leading' | 'center' | 'trailing') =>
  createIosModifier('multilineTextAlignment', { alignment })

/**
 * Uses fixed-width digits for text inside, so changing numbers do not shift.
 *
 * @since iOS 16.0
 */
export const monospacedDigit = () => createIosModifier('monospacedDigit')
