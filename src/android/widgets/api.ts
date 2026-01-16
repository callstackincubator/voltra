import VoltraModule from '../../VoltraModule.js'
import { renderAndroidWidgetToString } from './renderer.js'
import type { AndroidWidgetVariants, UpdateAndroidWidgetOptions } from './types.js'

// Re-export types for public API
export type { AndroidWidgetSize, AndroidWidgetSizeVariant, AndroidWidgetVariants, UpdateAndroidWidgetOptions } from './types.js'

/**
 * @unstable This API is experimental and may change in future versions.
 *
 * Update an Android home screen widget with new content.
 *
 * The content will be stored in SharedPreferences and the widget
 * will be updated to display the new content.
 *
 * @param widgetId - The widget identifier
 * @param variants - An array of size variants with their breakpoints and content.
 *   Android will automatically select the best matching variant based on the
 *   actual widget dimensions.
 * @param options - Optional settings like deep link URL
 *
 * @example Different content per size
 * ```tsx
 * import { VoltraAndroid, unstable_updateAndroidWidget } from 'voltra'
 *
 * await unstable_updateAndroidWidget('weather', [
 *   {
 *     size: { width: 150, height: 100 },
 *     content: <VoltraAndroid.Text fontSize={32}>72°F</VoltraAndroid.Text>
 *   },
 *   {
 *     size: { width: 250, height: 150 },
 *     content: (
 *       <VoltraAndroid.Row>
 *         <VoltraAndroid.Text fontSize={32}>72°F</VoltraAndroid.Text>
 *         <VoltraAndroid.Column>
 *           <VoltraAndroid.Text>Sunny</VoltraAndroid.Text>
 *           <VoltraAndroid.Text>High: 78° Low: 65°</VoltraAndroid.Text>
 *         </VoltraAndroid.Column>
 *       </VoltraAndroid.Row>
 *     )
 *   }
 * ], { deepLinkUrl: '/weather' })
 * ```
 */
export const unstable_updateAndroidWidget = async (
  widgetId: string,
  variants: AndroidWidgetVariants,
  options?: UpdateAndroidWidgetOptions
): Promise<void> => {
  const payload = renderAndroidWidgetToString(variants)

  return VoltraModule.updateAndroidWidget(widgetId, payload, {
    deepLinkUrl: options?.deepLinkUrl,
  })
}

/**
 * @unstable This API is experimental and may change in future versions.
 *
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
 * await unstable_reloadAndroidWidgets(['weather', 'calendar'])
 *
 * // Reload all widgets
 * await unstable_reloadAndroidWidgets()
 * ```
 */
export const unstable_reloadAndroidWidgets = async (widgetIds?: string[]): Promise<void> => {
  return VoltraModule.reloadAndroidWidgets(widgetIds ?? null)
}

/**
 * @unstable This API is experimental and may change in future versions.
 *
 * Clear a widget's stored data.
 *
 * This removes the JSON content and deep link URL for the specified widget,
 * causing it to show its placeholder state.
 *
 * @param widgetId - The widget identifier to clear
 *
 * @example
 * ```typescript
 * await unstable_clearAndroidWidget('weather')
 * ```
 */
export const unstable_clearAndroidWidget = async (widgetId: string): Promise<void> => {
  return VoltraModule.clearAndroidWidget(widgetId)
}

/**
 * @unstable This API is experimental and may change in future versions.
 *
 * Clear all widgets' stored data.
 *
 * This removes the JSON content and deep link URLs for all configured widgets,
 * causing them to show their placeholder states.
 *
 * @example
 * ```typescript
 * await unstable_clearAllAndroidWidgets()
 * ```
 */
export const unstable_clearAllAndroidWidgets = async (): Promise<void> => {
  return VoltraModule.clearAllAndroidWidgets()
}
