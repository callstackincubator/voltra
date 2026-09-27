import type { AndroidColorValue, AndroidDynamicColorToken } from '../dynamic-colors.js'
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

/**
 * A static color string. Resolves to `never` for an `AndroidDynamicColors` token, so passing one
 * where Glance needs a concrete color is a compile-time error.
 */
export type StaticColor<Color extends string> = Color extends AndroidDynamicColorToken ? never : Color

export type DayNightColors<Day extends string = string, Night extends string = string> = {
  /** Static color used in light mode. `AndroidDynamicColors` tokens are not accepted. */
  day: StaticColor<Day>
  /** Static color used in dark mode. `AndroidDynamicColors` tokens are not accepted. */
  night: StaticColor<Night>
}

/** At least one of the two keys is required. */
export type SemanticsValues =
  | {
      /** Text read by accessibility services. */
      contentDescription: string
      /**
       * Identifier for Glance's own test APIs. The widget on a device does not expose it, so UI
       * tests cannot find it.
       */
      testTag?: string
    }
  | {
      /** Text read by accessibility services. */
      contentDescription?: string
      /**
       * Identifier for Glance's own test APIs. The widget on a device does not expose it, so UI
       * tests cannot find it.
       */
      testTag: string
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
export const background = <Day extends string, Night extends string>(
  color: AndroidColorValue | DayNightColors<Day, Night>
) => createAndroidModifier('background', typeof color === 'string' ? { color } : { day: color.day, night: color.night })

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
 * Use it once per widget, on the outermost component. Only one component keeps it: the first that
 * appears once in the widget, and none inside a widget with a `Scaffold`, which marks its own.
 *
 * @since Android 12
 */
export const appWidgetBackground = () => createAndroidModifier('appWidgetBackground')
