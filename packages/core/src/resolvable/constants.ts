export const RESOLVABLE_SENTINEL_KEY = '$rv'

export const RESOLVABLE_ENV_IDS = {
  renderingMode: 0,
  showsWidgetContainerBackground: 1,
  primary: 2,
  onPrimary: 3,
  primaryContainer: 4,
  onPrimaryContainer: 5,
  secondary: 6,
  onSecondary: 7,
  secondaryContainer: 8,
  onSecondaryContainer: 9,
  tertiary: 10,
  onTertiary: 11,
  tertiaryContainer: 12,
  onTertiaryContainer: 13,
  error: 14,
  errorContainer: 15,
  onError: 16,
  onErrorContainer: 17,
  background: 18,
  onBackground: 19,
  surface: 20,
  onSurface: 21,
  surfaceVariant: 22,
  onSurfaceVariant: 23,
  outline: 24,
  inverseOnSurface: 25,
  inverseSurface: 26,
  inversePrimary: 27,
  widgetBackground: 28,
} as const

export const RESOLVABLE_VALUE_OPCODES = {
  env: 0,
  when: 1,
  match: 2,
} as const

export const RESOLVABLE_CONDITION_OPCODES = {
  eq: 0,
  ne: 1,
  and: 2,
  or: 3,
  not: 4,
  inList: 5,
} as const
