import type { UpdateWidgetOptions } from '../types.js'
import { assertRunningOnApple } from '../utils/assertRunningOnApple.js'
import VoltraModule from '../VoltraModule.js'
import { renderWidgetToString } from './renderer.js'
import { ScheduledWidgetEntry, WidgetInfo, WidgetVariants } from './types.js'

// Re-export types for public API
export type { UpdateWidgetOptions } from '../types.js'
export type { ScheduledWidgetEntry, WidgetInfo } from './types.js'

/**
 * Update a home screen widget with new content.
 *
 * The content will be stored in App Group storage and the widget timeline
 * will be reloaded to display the new content.
 *
 * @param widgetId - The widget identifier (as defined in your config plugin)
 * @param variants - An object mapping widget families to specific content.
 *   Each key corresponds to a widget size family.
 * @param options - Optional settings like deep link URL
 *
 * @example Different content per size
 * ```tsx
 * import { updateWidget, Voltra } from 'voltra'
 *
 * await updateWidget('weather', {
 *   systemSmall: <Voltra.Text fontSize={32}>72°F</Voltra.Text>,
 *   systemMedium: (
 *     <Voltra.HStack>
 *       <Voltra.Text fontSize={32}>72°F</Voltra.Text>
 *       <Voltra.VStack>
 *         <Voltra.Text>Sunny</Voltra.Text>
 *         <Voltra.Text>High: 78° Low: 65°</Voltra.Text>
 *       </Voltra.VStack>
 *     </Voltra.HStack>
 *   ),
 * }, { deepLinkUrl: '/weather' })
 * ```
 */
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

/**
 * Reload widget timelines to refresh their content.
 *
 * Use this after updating data that widgets depend on (e.g., after preloading
 * new images) to force them to re-render.
 *
 * @param widgetIds - Optional array of widget IDs to reload. If omitted, reloads all widgets.
 *
 * @example
 * ```typescript
 * // Reload specific widgets
 * await reloadWidgets(['weather', 'calendar'])
 *
 * // Reload all widgets
 * await reloadWidgets()
 * ```
 */
export const reloadWidgets = async (widgetIds?: string[]): Promise<void> => {
  if (!assertRunningOnApple()) return Promise.resolve()

  return VoltraModule.reloadWidgets(widgetIds ?? null)
}

/**
 * Clear a widget's stored data.
 *
 * This removes the JSON content and deep link URL for the specified widget,
 * causing it to show its placeholder state.
 *
 * @param widgetId - The widget identifier to clear
 *
 * @example
 * ```typescript
 * await clearWidget('weather')
 * ```
 */
export const clearWidget = async (widgetId: string): Promise<void> => {
  if (!assertRunningOnApple()) return Promise.resolve()

  return VoltraModule.clearWidget(widgetId)
}

/**
 * Clear all widgets' stored data.
 *
 * This removes the JSON content and deep link URLs for all configured widgets,
 * causing them to show their placeholder states.
 *
 * @example
 * ```typescript
 * await clearAllWidgets()
 * ```
 */
export const clearAllWidgets = async (): Promise<void> => {
  if (!assertRunningOnApple()) return Promise.resolve()

  return VoltraModule.clearAllWidgets()
}

/**
 * Schedule a widget timeline with multiple entries to be displayed at future times.
 *
 * iOS will automatically display each entry at its scheduled time, even when your
 * app is not running. This allows you to batch widget updates in advance.
 *
 * @param widgetId - The widget identifier (as defined in your config plugin)
 * @param entries - Array of scheduled entries, each with a date and content variants
 * @param options - Optional settings like reload policy
 *
 * @example Schedule weather updates throughout the day
 * ```tsx
 * import { scheduleWidget, Voltra } from 'voltra'
 *
 * await scheduleWidget('weather', [
 *   {
 *     date: new Date('2026-01-16T09:00:00'),
 *     variants: {
 *       systemSmall: <Voltra.Text>Morning: 65°F</Voltra.Text>
 *     }
 *   },
 *   {
 *     date: new Date('2026-01-16T15:00:00'),
 *     variants: {
 *       systemSmall: <Voltra.Text>Afternoon: 72°F</Voltra.Text>
 *     }
 *   },
 *   {
 *     date: new Date('2026-01-16T21:00:00'),
 *     variants: {
 *       systemSmall: <Voltra.Text>Evening: 68°F</Voltra.Text>
 *     }
 *   }
 * ], {
 *   policy: { type: 'atEnd' } // Request new timeline when last entry expires
 * })
 * ```
 *
 * @example With deep links per entry
 * ```tsx
 * await scheduleWidget('news', [
 *   {
 *     date: new Date('2026-01-16T08:00:00'),
 *     variants: { systemSmall: <Voltra.Text>Morning News</Voltra.Text> },
 *     deepLinkUrl: '/news/morning'
 *   },
 *   {
 *     date: new Date('2026-01-16T20:00:00'),
 *     variants: { systemSmall: <Voltra.Text>Evening News</Voltra.Text> },
 *     deepLinkUrl: '/news/evening'
 *   }
 * ])
 * ```
 */
export const scheduleWidget = async (widgetId: string, entries: ScheduledWidgetEntry[]): Promise<void> => {
  if (!assertRunningOnApple()) return Promise.resolve()

  // Render each entry's variants to JSON
  const renderedEntries = entries.map((entry) => ({
    date: entry.date.getTime(), // Convert to milliseconds timestamp
    json: renderWidgetToString(entry.variants),
    deepLinkUrl: entry.deepLinkUrl,
  }))

  // Prepare timeline data (always use 'never' policy since widget extension can't regenerate content)
  const timelineData = {
    entries: renderedEntries,
    policy: { type: 'never' },
  }

  const timelineJson = JSON.stringify(timelineData)

  return VoltraModule.scheduleWidget(widgetId, timelineJson)
}

/**
 * Fetches all active widget configurations for the containing app on iOS.
 *
 * @returns A promise that resolves to an array of active widget configurations.
 *
 * @example
 * ```typescript
 * const widgets = await getActiveWidgets()
 * console.log('Active widgets:', widgets)
 * ```
 */
export const getActiveWidgets = async (): Promise<WidgetInfo[]> => {
  if (!assertRunningOnApple()) return []

  return VoltraModule.getActiveWidgets()
}
