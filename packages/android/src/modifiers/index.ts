import type { AndroidColorValue } from '../dynamic-colors.js'
import { createAndroidModifier } from './createAndroidModifier.js'

export type { AndroidModifier } from './createAndroidModifier.js'

export type PaddingValues = {
  all?: number
  horizontal?: number
  vertical?: number
  start?: number
  top?: number
  end?: number
  bottom?: number
}

export type AbsolutePaddingValues = {
  all?: number
  horizontal?: number
  vertical?: number
  left?: number
  top?: number
  right?: number
  bottom?: number
}

export type DayNightColors = {
  /** Static color used in light mode. */
  day: string
  /** Static color used in dark mode. */
  night: string
}

export type SemanticsValues = {
  /** Text read by accessibility services. */
  contentDescription?: string
  /** Identifier for UI tests. */
  testTag?: string
}

/**
 * Adds padding in dp, mirrored in right-to-left layouts. The most specific edge wins (`start` over
 * `horizontal` over `all`). Glance adds repeated padding together, including `style.padding`.
 *
 * @since Android 7.0
 */
export const padding = (values: number | PaddingValues) => {
  if (typeof values === 'number') {
    return createAndroidModifier('padding', { all: values })
  }
  // Copy only the known edges so extra keys on a caller's object never reach the device.
  const { all, horizontal, vertical, start, top, end, bottom } = values
  return createAndroidModifier('padding', { all, horizontal, vertical, start, top, end, bottom })
}

/**
 * Adds padding in dp that ignores the layout direction. Adds up with `padding` and `style.padding`.
 *
 * @since Android 7.0
 */
export const absolutePadding = (values: number | AbsolutePaddingValues) => {
  if (typeof values === 'number') {
    return createAndroidModifier('absolutePadding', { all: values })
  }
  const { all, horizontal, vertical, left, top, right, bottom } = values
  return createAndroidModifier('absolutePadding', { all, horizontal, vertical, left, top, right, bottom })
}

/**
 * Sets a fixed width in dp.
 *
 * @since Android 7.0
 */
export const width = (dp: number) => createAndroidModifier('width', { width: dp })

/**
 * Sets a fixed height in dp.
 *
 * @since Android 7.0
 */
export const height = (dp: number) => createAndroidModifier('height', { height: dp })

/**
 * Sets a fixed size in dp. A single number sets both dimensions.
 *
 * @since Android 7.0
 */
export const size = (value: number | { width: number; height: number }) =>
  createAndroidModifier(
    'size',
    typeof value === 'number' ? { width: value, height: value } : { width: value.width, height: value.height }
  )

/** @since Android 7.0 */
export const fillMaxWidth = () => createAndroidModifier('fillMaxWidth')
/** @since Android 7.0 */
export const fillMaxHeight = () => createAndroidModifier('fillMaxHeight')
/** @since Android 7.0 */
export const fillMaxSize = () => createAndroidModifier('fillMaxSize')
/** @since Android 7.0 */
export const wrapContentWidth = () => createAndroidModifier('wrapContentWidth')
/** @since Android 7.0 */
export const wrapContentHeight = () => createAndroidModifier('wrapContentHeight')
/** @since Android 7.0 */
export const wrapContentSize = () => createAndroidModifier('wrapContentSize')

/**
 * Fills the background with a color: a static color, an `AndroidDynamicColors` token, or a pair of
 * static colors for light and dark mode.
 *
 * @since Android 7.0
 */
export const background = (color: AndroidColorValue | DayNightColors) =>
  createAndroidModifier('background', typeof color === 'string' ? { color } : { day: color.day, night: color.night })

/**
 * Rounds the corners in dp. Glance ignores it below Android 12 (API 31).
 *
 * @since Android 12
 */
export const cornerRadius = (radius: number) => createAndroidModifier('cornerRadius', { radius })

/**
 * Shows, hides (keeping its space), or removes the component from layout.
 *
 * @since Android 7.0
 */
export const visibility = (value: 'visible' | 'invisible' | 'gone') =>
  createAndroidModifier('visibility', { visibility: value })

/**
 * Sets accessibility and test metadata.
 *
 * @since Android 7.0
 */
export const semantics = (values: SemanticsValues) =>
  createAndroidModifier('semantics', { contentDescription: values.contentDescription, testTag: values.testTag })

/**
 * Marks the widget's background view so the launcher can animate it when the widget opens the app.
 * Use it once per widget, on the outermost component.
 *
 * @since Android 12
 */
export const appWidgetBackground = () => createAndroidModifier('appWidgetBackground')
