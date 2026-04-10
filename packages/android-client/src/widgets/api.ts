import {
  renderAndroidWidgetToString,
  type AndroidWidgetVariants,
  type UpdateAndroidWidgetOptions,
  type WidgetInfo,
} from '@use-voltra/android'

import VoltraModule from '../VoltraModule.js'

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

  return VoltraModule.updateAndroidWidget(widgetId, payload, {
    deepLinkUrl: options?.deepLinkUrl,
  })
}

export const reloadAndroidWidgets = async (widgetIds?: string[]): Promise<void> => {
  return VoltraModule.reloadAndroidWidgets(widgetIds ?? null)
}

export const clearAndroidWidget = async (widgetId: string): Promise<void> => {
  return VoltraModule.clearAndroidWidget(widgetId)
}

export const clearAllAndroidWidgets = async (): Promise<void> => {
  return VoltraModule.clearAllAndroidWidgets()
}

export const requestPinAndroidWidget = async (
  widgetId: string,
  options?: { previewWidth?: number; previewHeight?: number }
): Promise<boolean> => {
  return VoltraModule.requestPinGlanceAppWidget(widgetId, options)
}

export const getActiveWidgets = async (): Promise<WidgetInfo[]> => {
  return VoltraModule.getActiveWidgets()
}
