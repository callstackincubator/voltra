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

/**
 * Returns the current parameter values for a configurable widget (iOS 17+).
 *
 * Parameter values are written to App Group storage by the widget extension when the user
 * edits the widget. The returned object is keyed by parameter ID (as defined in the config
 * plugin) with string-encoded values — cast as needed (`"true"`/`"false"` for booleans,
 * numeric strings for `int`/`double`, raw enum values for `enum` parameters).
 *
 * Returns an empty object if the widget has not been placed or edited yet, or if
 * `groupIdentifier` is not configured in the Voltra plugin.
 *
 * @param widgetId - The widget identifier as defined in the config plugin.
 *
 * @example
 * ```ts
 * const params = getWidgetParameters('news')
 * // { category: 'tech', showImages: 'true' }
 *
 * const showImages = params.showImages === 'true'
 * const category = params.category ?? 'top'
 * ```
 */
export const getWidgetParameters = (widgetId: string): Record<string, string> => {
  if (!assertRunningOnApple()) return {}

  return VoltraModule.getWidgetParameters(widgetId)
}
