import { createContext, useContext } from 'react'

export type AndroidWidgetRenderTheme = 'light' | 'dark'

export type AndroidDynamicColorPalette = {
  primary: string
  onPrimary: string
  primaryContainer: string
  onPrimaryContainer: string
  secondary: string
  onSecondary: string
  secondaryContainer: string
  onSecondaryContainer: string
  tertiary: string
  onTertiary: string
  tertiaryContainer: string
  onTertiaryContainer: string
  error: string
  errorContainer: string
  onError: string
  onErrorContainer: string
  background: string
  onBackground: string
  surface: string
  onSurface: string
  surfaceVariant: string
  onSurfaceVariant: string
  outline: string
  inverseOnSurface: string
  inverseSurface: string
  inversePrimary: string
  widgetBackground: string
}

export type AndroidWidgetRenderContextValue = {
  theme: AndroidWidgetRenderTheme | null
  dynamicColorPalette: AndroidDynamicColorPalette | null
}

export const ANDROID_DYNAMIC_COLOR_PALETTE_ORDER = [
  'primary',
  'onPrimary',
  'primaryContainer',
  'onPrimaryContainer',
  'secondary',
  'onSecondary',
  'secondaryContainer',
  'onSecondaryContainer',
  'tertiary',
  'onTertiary',
  'tertiaryContainer',
  'onTertiaryContainer',
  'error',
  'errorContainer',
  'onError',
  'onErrorContainer',
  'background',
  'onBackground',
  'surface',
  'onSurface',
  'surfaceVariant',
  'onSurfaceVariant',
  'outline',
  'inverseOnSurface',
  'inverseSurface',
  'inversePrimary',
  'widgetBackground',
] as const satisfies readonly (keyof AndroidDynamicColorPalette)[]

export const AndroidWidgetRenderContext = createContext<AndroidWidgetRenderContextValue | null>(null)
export const AndroidWidgetRenderContextProvider = AndroidWidgetRenderContext.Provider
export type GetAndroidDynamicColorPalette = () => string[] | null

const COLOR_PATTERN = /^#[0-9a-f]{8}$/i

const normalizePaletteColor = (value: unknown): string | null => {
  if (typeof value !== 'string' || !COLOR_PATTERN.test(value)) {
    return null
  }

  return value.toLowerCase()
}

export const androidDynamicColorPaletteFromArray = (
  value: unknown
): AndroidDynamicColorPalette | null => {
  if (!Array.isArray(value) || value.length !== ANDROID_DYNAMIC_COLOR_PALETTE_ORDER.length) {
    return null
  }

  const palette = {} as AndroidDynamicColorPalette

  for (const [index, key] of ANDROID_DYNAMIC_COLOR_PALETTE_ORDER.entries()) {
    const normalizedValue = normalizePaletteColor(value[index])
    if (!normalizedValue) {
      return null
    }

    palette[key] = normalizedValue
  }

  return palette
}

export const androidDynamicColorPaletteToArray = (
  palette: AndroidDynamicColorPalette
): string[] | null => {
  const colors: string[] = []

  for (const key of ANDROID_DYNAMIC_COLOR_PALETTE_ORDER) {
    const normalizedValue = normalizePaletteColor(palette[key])
    if (!normalizedValue) {
      return null
    }

    colors.push(normalizedValue)
  }

  return colors
}

export const parseAndroidDynamicColorPalette = (
  serializedPalette: string | null | undefined
): AndroidDynamicColorPalette | null => {
  if (!serializedPalette) {
    return null
  }

  try {
    return androidDynamicColorPaletteFromArray(JSON.parse(serializedPalette))
  } catch {
    return null
  }
}

export const serializeAndroidDynamicColorPalette = (
  palette: AndroidDynamicColorPalette | null | undefined
): string | null => {
  if (!palette) {
    return null
  }

  const colors = androidDynamicColorPaletteToArray(palette)
  return colors ? JSON.stringify(colors) : null
}

export const createAndroidWidgetRenderContextValue = (
  theme: AndroidWidgetRenderTheme | null,
  serializedPalette: string | null | undefined
): AndroidWidgetRenderContextValue => {
  return {
    theme,
    dynamicColorPalette: parseAndroidDynamicColorPalette(serializedPalette),
  }
}

export const useAndroidDynamicColorPalette = (): AndroidDynamicColorPalette | null => {
  const renderContext = useContext(AndroidWidgetRenderContext)
  if (!renderContext) {
    throw new Error('This is an internal problem in Voltra. Please report the issue.')
  }

  return renderContext.dynamicColorPalette
}
