import { ReactNode } from 'react'

import { renderVoltraVariantToJson, VOLTRA_PAYLOAD_VERSION } from './renderer'
import { assertRunningOnApple } from './utils/assertRunningOnApple'
import VoltraModule from './VoltraModule'

/**
 * Render widget variants to JSON following the same pattern as live activities.
 */
const renderWidgetVariantsToString = (variants: WidgetVariants): string => {
  const result: Record<string, any> = {
    v: VOLTRA_PAYLOAD_VERSION,
  }

  for (const [family, content] of Object.entries(variants)) {
    if (content !== undefined) {
      result[family] = renderVoltraVariantToJson(content)
    }
  }

  return JSON.stringify(result)
}

/**
 * Widget size families supported by iOS
 */
export type WidgetFamily =
  | 'systemSmall'
  | 'systemMedium'
  | 'systemLarge'
  | 'systemExtraLarge'
  | 'accessoryCircular'
  | 'accessoryRectangular'
  | 'accessoryInline'

/**
 * Widget variants following the same pattern as VoltraVariants.
 * Each key corresponds to a widget family.
 */
export type WidgetVariants = Partial<Record<WidgetFamily, ReactNode>>

/**
 * @deprecated Use WidgetVariants instead
 */
export type WidgetContent = ReactNode | WidgetVariants

/**
 * Options for updating a home screen widget
 */
export type UpdateWidgetOptions = {
  /**
   * URL to open when the widget is tapped.
   * Can be a full URL (e.g., "myapp://screen/details")
   * or a path that will be prefixed with your app's URL scheme.
   */
  deepLinkUrl?: string
}

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

  const payload = renderWidgetVariantsToString(variants)

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
