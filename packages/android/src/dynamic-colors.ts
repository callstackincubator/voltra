export const AndroidDynamicColors = {
  primary: '~p',
  onPrimary: '~op',
  primaryContainer: '~pc',
  onPrimaryContainer: '~opc',
  secondary: '~s',
  onSecondary: '~os',
  secondaryContainer: '~sc',
  onSecondaryContainer: '~osc',
  tertiary: '~t',
  onTertiary: '~ot',
  tertiaryContainer: '~tc',
  onTertiaryContainer: '~otc',
  error: '~e',
  errorContainer: '~ec',
  onError: '~oe',
  onErrorContainer: '~oec',
  background: '~b',
  onBackground: '~ob',
  surface: '~sf',
  onSurface: '~osf',
  surfaceVariant: '~sv',
  onSurfaceVariant: '~osv',
  outline: '~ol',
  inverseOnSurface: '~ios',
  inverseSurface: '~is',
  inversePrimary: '~ip',
  widgetBackground: '~wb',
} as const

export type AndroidDynamicColorRole = keyof typeof AndroidDynamicColors
export type AndroidDynamicColorToken = (typeof AndroidDynamicColors)[AndroidDynamicColorRole]

/**
 * A static color string. Resolves to `never` for an `AndroidDynamicColors` token, so passing one
 * where Glance needs a concrete color is a compile-time error where the literal is inferred.
 */
export type StaticColor<Color extends string> = Color extends AndroidDynamicColorToken ? never : Color

/** A pair of static colors for light and dark mode. */
export type AndroidColorPair<Day extends string = string, Night extends string = string> = {
  /** Static color used in light mode. `AndroidDynamicColors` tokens are not accepted. */
  day: StaticColor<Day>
  /** Static color used in dark mode. `AndroidDynamicColors` tokens are not accepted. */
  night: StaticColor<Night>
}

/** A static color string, an `AndroidDynamicColors` token, or a pair of static colors for light and dark mode. */
export type AndroidColorValue<Day extends string = string, Night extends string = string> =
  | string
  | AndroidDynamicColorToken
  | AndroidColorPair<Day, Night>
