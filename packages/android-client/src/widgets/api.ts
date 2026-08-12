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
 * Set a widget-type configuration value for a Dynamic Widget and re-render it. The value is
 * surfaced as `env.configuration[key]` in the widget's `(props, env) => JSX` render. Stand-in
 * for a Glance configuration activity.
 *
 * Note: instance-level values shadow widget-type values. Once a widget instance has its own
 * value for `key` (see {@link setWidgetInstanceConfiguration}), that instance keeps reading its
 * instance value — calling this will not visibly change it, even though the call still succeeds
 * and updates the shared widget-type default for every other, unconfigured instance.
 */
export const setWidgetConfiguration = async (widgetId: string, key: string, value: string): Promise<void> => {
  return getNativeVoltraAndroid().setWidgetConfiguration(widgetId, key, value)
}

function assertStringRecord(values: Record<string, string>): void {
  for (const [key, value] of Object.entries(values)) {
    if (typeof value !== 'string') {
      throw new Error(`setWidgetInstanceConfiguration: value for key "${key}" must be a string, got ${typeof value}`)
    }
  }
}

/**
 * Set a configuration value for one placed Android widget instance.
 *
 * The instance is identified by its `appWidgetId`, which lets multiple widgets of the same type
 * keep different configuration values.
 */
export function setWidgetInstanceConfiguration(appWidgetId: number, key: string, value: string): Promise<void>
/**
 * Set multiple configuration values for one placed Android widget instance in a single call.
 * Batching keys this way costs one bridge call, one DataStore transaction, and one widget
 * re-render — instead of one of each per key.
 */
export function setWidgetInstanceConfiguration(appWidgetId: number, values: Record<string, string>): Promise<void>
export function setWidgetInstanceConfiguration(
  appWidgetId: number,
  keyOrValues: string | Record<string, string>,
  value?: string
): Promise<void> {
  const values: Record<string, string> =
    typeof keyOrValues === 'string' ? { [keyOrValues]: value as string } : keyOrValues

  assertStringRecord(values)

  return getNativeVoltraAndroid().setWidgetInstanceConfiguration(appWidgetId, JSON.stringify(values))
}

/**
 * Read the fully merged configuration for one placed Android widget instance — code defaults,
 * widget-type values, and instance values, merged in that precedence. This is exactly what the
 * widget sees as `env.configuration`.
 */
export const getWidgetInstanceConfiguration = async (appWidgetId: number): Promise<Record<string, string>> => {
  const json = await getNativeVoltraAndroid().getWidgetInstanceConfiguration(appWidgetId)
  return JSON.parse(json) as Record<string, string>
}

/**
 * Read the merged configuration for a Dynamic Widget type — code defaults and widget-type
 * values, merged in that precedence. Does not include any per-instance layer.
 */
export const getWidgetConfiguration = async (widgetId: string): Promise<Record<string, string>> => {
  const json = await getNativeVoltraAndroid().getWidgetConfiguration(widgetId)
  return JSON.parse(json) as Record<string, string>
}

/**
 * Clear one placed Android widget instance's configuration, falling back to widget-type/default
 * values, and re-render it.
 */
export const clearWidgetInstanceConfiguration = async (appWidgetId: number): Promise<void> => {
  return getNativeVoltraAndroid().clearWidgetInstanceConfiguration(appWidgetId)
}
