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
