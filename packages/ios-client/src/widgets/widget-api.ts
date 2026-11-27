import { renderWidgetToString, type ScheduledWidgetEntry, type WidgetInfo, type WidgetVariants } from '@use-voltra/ios'

import type { UpdateWidgetOptions } from '../types.js'
import { assertRunningOnApple } from '../utils/assertRunningOnApple.js'
import { getNativeVoltra } from '../VoltraModule.js'

export type { UpdateWidgetOptions } from '../types.js'
export type { ScheduledWidgetEntry, WidgetInfo } from '@use-voltra/ios'

export const updateWidget = async (
  widgetId: string,
  variants: WidgetVariants,
  options?: UpdateWidgetOptions
): Promise<void> => {
  if (!assertRunningOnApple()) return Promise.resolve()

  const payload = renderWidgetToString(variants)

  return getNativeVoltra().updateWidget(widgetId, payload, {
    deepLinkUrl: options?.deepLinkUrl,
  })
}

export const reloadWidgets = async (widgetIds?: string[]): Promise<void> => {
  if (!assertRunningOnApple()) return Promise.resolve()

  return getNativeVoltra().reloadWidgets(widgetIds ?? null)
}

/**
 * Sets the choices the Edit Widget sheet lists for a widget's `dynamicOptions` parameter, such as
 * the places a user follows. The chosen option's `value` reaches the widget as
 * `env.configuration[parameter]`. A placement whose choice is no longer listed falls back to the
 * first option, and with no options it is `""`. The widget reloads once the options are stored.
 * Requires `groupIdentifier`.
 *
 * Throws if an option's `value` or `title` is not a string, or a `value` is empty or repeated.
 * Rejects with `VOLTRA_WIDGET_NOT_FOUND`, `VOLTRA_WIDGET_KIND_MISMATCH` for a payload-driven widget,
 * or `VOLTRA_WIDGET_PARAMETER_NOT_DECLARED` when the widget declares no such `dynamicOptions` parameter.
 */
export const setWidgetParameterOptions = async (
  widgetId: string,
  parameter: string,
  options: WidgetParameterOption[]
): Promise<void> => {
  if (!assertRunningOnApple()) return Promise.resolve()

  // A value is the choice's identity in Edit Widget, so it must be a unique, non-empty string: an
  // empty one reads as "no choices", and a duplicate could not be told apart.
  const values = new Set<string>()
  for (const option of options) {
    if (typeof option?.value !== 'string' || typeof option.title !== 'string') {
      throw new Error('[Voltra][iOS] setWidgetParameterOptions: each option needs a string value and title')
    }
    if (option.value === '') {
      throw new Error('[Voltra][iOS] setWidgetParameterOptions: an option value cannot be empty')
    }
    if (values.has(option.value)) {
      throw new Error(`[Voltra][iOS] setWidgetParameterOptions: duplicate option value "${option.value}"`)
    }
    values.add(option.value)
  }

  return getNativeVoltra().setWidgetParameterOptions(widgetId, parameter, JSON.stringify(options))
}

export type WidgetParameterOption = { value: string; title: string }

export const clearWidget = async (widgetId: string): Promise<void> => {
  if (!assertRunningOnApple()) return Promise.resolve()

  return getNativeVoltra().clearWidget(widgetId)
}

export const clearAllWidgets = async (): Promise<void> => {
  if (!assertRunningOnApple()) return Promise.resolve()

  return getNativeVoltra().clearAllWidgets()
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

  return getNativeVoltra().scheduleWidget(widgetId, timelineJson)
}

export const getActiveWidgets = async (): Promise<WidgetInfo[]> => {
  if (!assertRunningOnApple()) return []

  return getNativeVoltra().getActiveWidgets()
}
