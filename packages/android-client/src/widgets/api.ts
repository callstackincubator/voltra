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
 */
export const setWidgetConfiguration = async (widgetId: string, key: string, value: string): Promise<void> => {
  return getNativeVoltraAndroid().setWidgetConfiguration(widgetId, key, value)
}

/**
 * Set a configuration value for one placed Android widget instance.
 *
 * The instance is identified by its `appWidgetId`, which lets multiple widgets of the same type
 * keep different configuration values.
 */
export const setWidgetInstanceConfiguration = async (
  appWidgetId: number,
  key: string,
  value: string
): Promise<void> => {
  return getNativeVoltraAndroid().setWidgetInstanceConfiguration(appWidgetId, key, value)
}

/**
 * Finish a widget configuration activity after the app has saved the instance settings.
 */
export const completeWidgetConfiguration = async (appWidgetId: number): Promise<void> => {
  return getNativeVoltraAndroid().completeWidgetConfiguration(appWidgetId)
}

/**
 * Cancel a widget configuration activity without saving changes.
 */
export const cancelWidgetConfiguration = async (): Promise<void> => {
  return getNativeVoltraAndroid().cancelWidgetConfiguration()
}
