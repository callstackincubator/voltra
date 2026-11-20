import type { AndroidDynamicColors } from './dynamic-colors.js'

/** A color role a Dynamic Widget theme can set: any key of {@link AndroidDynamicColors}. */
export type AndroidThemeColorRole = keyof typeof AndroidDynamicColors

/**
 * The `theme` a Dynamic Widget's entry module may export next to its default render function.
 *
 * Each side maps roles to literal colors (hex, `rgb()`, `hsl()` or a named color). A role set on
 * both sides replaces that role's color wherever the widget uses its token (`~p` for `primary`,
 * for example); every other role keeps the default palette.
 */
export type AndroidWidgetTheme = {
  day: Partial<Record<AndroidThemeColorRole, string>>
  night: Partial<Record<AndroidThemeColorRole, string>>
  /**
   * Whether the system's dynamic palette wins over this theme from Android 12. Defaults to `true`;
   * below Android 12 there is no dynamic palette and the theme always applies.
   */
  dynamicColors?: boolean
}
