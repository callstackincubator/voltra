import { renderWidgetToString, type ScheduledWidgetEntry, type WidgetInfo, type WidgetVariants } from '@use-voltra/ios'

import type { UpdateWidgetOptions } from '../types.js'
import { assertRunningOnApple } from '../utils/assertRunningOnApple.js'
import VoltraModule from '../VoltraModule.js'

export type { UpdateWidgetOptions } from '../types.js'
export type { ScheduledWidgetEntry, WidgetInfo } from '@use-voltra/ios'

export const updateWidget = async (
  widgetId: string,
  variants: WidgetVariants,
  options?: UpdateWidgetOptions
): Promise<void> => {
  if (!assertRunningOnApple()) return Promise.resolve()

  const payload = renderWidgetToString(variants)

  return VoltraModule.updateWidget(widgetId, payload, {
    deepLinkUrl: options?.deepLinkUrl,
  })
}

export const reloadWidgets = async (widgetIds?: string[]): Promise<void> => {
  if (!assertRunningOnApple()) return Promise.resolve()

  return VoltraModule.reloadWidgets(widgetIds ?? null)
}

export const clearWidget = async (widgetId: string): Promise<void> => {
  if (!assertRunningOnApple()) return Promise.resolve()

  return VoltraModule.clearWidget(widgetId)
}

export const clearAllWidgets = async (): Promise<void> => {
  if (!assertRunningOnApple()) return Promise.resolve()

  return VoltraModule.clearAllWidgets()
}

export const scheduleWidget = async (widgetId: string, entries: ScheduledWidgetEntry[]): Promise<void> => {
  if (!assertRunningOnApple()) return Promise.resolve()

  const renderedEntries = entries.map((entry) => ({
    date: entry.date.getTime(),
    json: renderWidgetToString(entry.variants),
    deepLinkUrl: entry.deepLinkUrl,
  }))

  const timelineData = {
    entries: renderedEntries,
    policy: { type: 'never' },
  }

  const timelineJson = JSON.stringify(timelineData)

  return VoltraModule.scheduleWidget(widgetId, timelineJson)
}

export const getActiveWidgets = async (): Promise<WidgetInfo[]> => {
  if (!assertRunningOnApple()) return []

  return VoltraModule.getActiveWidgets()
}
