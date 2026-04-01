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
export type AndroidColorValue = string | AndroidDynamicColorToken
