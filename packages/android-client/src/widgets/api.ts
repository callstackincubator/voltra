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
 * Track 4 PoC: write an AppIntent parameter for a widget and trigger an
 * immediate Glance update so the new value gets picked up at the next render.
 *
 * Stand-in for a future Glance configuration activity — the example app's
 * Reactive Widget screen calls this directly.
 */
export const setAppIntentParam = async (widgetId: string, name: string, value: string): Promise<void> => {
  return getNativeVoltraAndroid().setAppIntentParam(widgetId, name, value)
}
