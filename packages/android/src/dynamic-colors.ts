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

type Chars<S extends string> = S extends `${infer C}${infer Rest}` ? C | Chars<Rest> : never
type Letter = Chars<'abcdefghijklmnopqrstuvwxyz'>

/**
 * A literal color string: hex, `rgb()`/`rgba()`, `hsl()`/`hsla()`, a color name or `transparent`.
 * `AndroidDynamicColors` tokens start with `~` and are not accepted.
 */
export type AndroidLiteralColor = `#${string}` | `${Letter | Uppercase<Letter>}${string}`

/**
 * A pair of literal colors that follows the system light/dark theme, not the time of day: `day` is
 * used in the light theme and `night` in the dark one.
 */
export type AndroidColorPair = {
  /** Color used in the light theme. `AndroidDynamicColors` tokens are not accepted. */
  day: AndroidLiteralColor
  /** Color used in the dark theme. `AndroidDynamicColors` tokens are not accepted. */
  night: AndroidLiteralColor
}

/** A literal color string, an `AndroidDynamicColors` token, or a pair of literal colors for light and dark mode. */
export type AndroidColorValue = string | AndroidDynamicColorToken | AndroidColorPair
