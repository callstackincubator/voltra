import {
  renderAndroidWidgetToString,
  type AndroidWidgetVariants,
  type UpdateAndroidWidgetOptions,
  type WidgetInfo,
} from '@use-voltra/android'

import { getNativeVoltraAndroid } from '../native/NativeVoltraAndroid.js'

export type {
  AndroidWidgetSize,
  AndroidWidgetSizeVariant,
  AndroidWidgetVariants,
  UpdateAndroidWidgetOptions,
  WidgetInfo,
} from '@use-voltra/android'

/**
 * Update a payload-driven widget's content.
 *
 * Rejects with `VOLTRA_WIDGET_KIND_MISMATCH` when `widgetId` belongs to a Dynamic Widget; use
 * {@link updateAndroidDynamicWidget} for those instead.
 */
export const updateAndroidWidget = async (
  widgetId: string,
  variants: AndroidWidgetVariants,
  options?: UpdateAndroidWidgetOptions
): Promise<void> => {
  const payload = renderAndroidWidgetToString(variants)

  return getNativeVoltraAndroid().updateAndroidWidget(widgetId, payload, {
    deepLinkUrl: options?.deepLinkUrl,
  })
}

export const reloadAndroidWidgets = async (widgetIds?: string[]): Promise<void> => {
  return getNativeVoltraAndroid().reloadAndroidWidgets(widgetIds ?? null)
}

export const clearAndroidWidget = async (widgetId: string): Promise<void> => {
  return getNativeVoltraAndroid().clearAndroidWidget(widgetId)
}

export const clearAllAndroidWidgets = async (): Promise<void> => {
  return getNativeVoltraAndroid().clearAllAndroidWidgets()
}

export const requestPinAndroidWidget = async (
  widgetId: string,
  options?: { previewWidth?: number; previewHeight?: number }
): Promise<boolean> => {
  return getNativeVoltraAndroid().requestPinGlanceAppWidget(widgetId, options)
}

export const getActiveWidgets = async (): Promise<WidgetInfo[]> => {
  return getNativeVoltraAndroid().getActiveWidgets() as Promise<WidgetInfo[]>
}

/**
 * Set a configuration value for a Dynamic Widget and re-render it. The value is
 * surfaced as `env.configuration[key]` in the widget's `(props, env) => JSX` render. Stand-in
 * for a Glance configuration activity.
 *
 * Rejects with `VOLTRA_WIDGET_KIND_MISMATCH` when `widgetId` belongs to a payload-driven widget,
 * and with `VOLTRA_WIDGET_NOT_FOUND` when `widgetId` is unknown.
 */
export const setWidgetConfiguration = async (widgetId: string, key: string, value: string): Promise<void> => {
  return getNativeVoltraAndroid().setWidgetConfiguration(widgetId, key, value)
}

/**
 * Read the configuration a Dynamic Widget's unconfigured placements render with: the defaults
 * declared in `appIntent.parameters`, overlaid with any values written by
 * {@link setWidgetConfiguration}. A placement's own values are not included — use
 * {@link getWidgetInstanceConfiguration} for those.
 *
 * Rejects with `VOLTRA_WIDGET_KIND_MISMATCH` when `widgetId` belongs to a payload-driven widget,
 * and with `VOLTRA_WIDGET_NOT_FOUND` when `widgetId` is unknown.
 */
export const getWidgetConfiguration = async (widgetId: string): Promise<Record<string, string>> => {
  const json = await getNativeVoltraAndroid().getWidgetConfiguration(widgetId)
  return JSON.parse(json) as Record<string, string>
}

/**
 * Set configuration for one placed widget instance and re-render just that placement.
 *
 * Every placement of an Android Dynamic Widget has its own `appWidgetId`, so two placements of the
 * same widget can show different things — one weather widget on London, another on New York. Read
 * the ids from {@link getActiveWidgets} (`appWidgetId`).
 *
 * Values written here shadow the widget-type values {@link setWidgetConfiguration} writes, which in
 * turn shadow the defaults from `appIntent.parameters`. A later type-level write does not visibly
 * change a placement that has its own value for the same key; {@link clearWidgetInstanceConfiguration}
 * drops the placement's values so it follows the type-level ones again.
 *
 * Pass an object to write several keys at once: they reach the device in one call and cost one
 * re-render.
 *
 * Rejects with `VOLTRA_WIDGET_INSTANCE_NOT_FOUND` when no widget of this app is placed with that
 * `appWidgetId`, `VOLTRA_WIDGET_KIND_MISMATCH` when the placement is a payload-driven widget, and
 * `VOLTRA_WIDGET_NOT_FOUND` when its widget id cannot be resolved. Nothing is stored unless the
 * call succeeds.
 */
export async function setWidgetInstanceConfiguration(appWidgetId: number, key: string, value: string): Promise<void>
export async function setWidgetInstanceConfiguration(appWidgetId: number, values: Record<string, string>): Promise<void>
export async function setWidgetInstanceConfiguration(
  appWidgetId: number,
  keyOrValues: string | Record<string, string>,
  value?: string
): Promise<void> {
  const values = typeof keyOrValues === 'string' ? { [keyOrValues]: value as string } : keyOrValues

  // Configuration values are strings on both platforms, and the bridge would otherwise coerce a
  // number or null into one silently. Failing here names the offending key.
  for (const [entryKey, entryValue] of Object.entries(values)) {
    if (typeof entryValue !== 'string') {
      throw new Error(
        `setWidgetInstanceConfiguration expects string values, but "${entryKey}" is ${typeof entryValue}.`
      )
    }
  }

  return getNativeVoltraAndroid().setWidgetInstanceConfiguration(appWidgetId, JSON.stringify(values))
}

/**
 * Read the configuration one placement renders with: the defaults, overlaid with the widget-type
 * values, overlaid with this placement's own values.
 *
 * Rejects with the same codes as {@link setWidgetInstanceConfiguration}.
 */
export const getWidgetInstanceConfiguration = async (appWidgetId: number): Promise<Record<string, string>> => {
  const json = await getNativeVoltraAndroid().getWidgetInstanceConfiguration(appWidgetId)
  return JSON.parse(json) as Record<string, string>
}

/**
 * Drop one placement's own configuration and re-render it, so it falls back to the widget-type
 * values and then the defaults. The widget-type values are left alone.
 *
 * Rejects with the same codes as {@link setWidgetInstanceConfiguration}.
 */
export const clearWidgetInstanceConfiguration = async (appWidgetId: number): Promise<void> => {
  return getNativeVoltraAndroid().clearWidgetInstanceConfiguration(appWidgetId)
}
