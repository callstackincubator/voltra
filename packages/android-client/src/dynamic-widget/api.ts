import { getNativeVoltraAndroid } from '../native/NativeVoltraAndroid.js'

export type AndroidDynamicWidgetPropsValue =
  | string
  | number
  | boolean
  | null
  | ReadonlyArray<AndroidDynamicWidgetPropsValue>
  | Readonly<{ [dynamicWidgetPropName: string]: AndroidDynamicWidgetPropsValue }>

export type AndroidDynamicWidgetProps = Readonly<{
  [dynamicWidgetPropName: string]: AndroidDynamicWidgetPropsValue
}>

/**
 * Update a Dynamic Widget's props.
 *
 * Rejects with `VOLTRA_WIDGET_KIND_MISMATCH` when `dynamicWidgetId` belongs to a payload-driven
 * widget, and with `VOLTRA_WIDGET_NOT_FOUND` when `dynamicWidgetId` is unknown.
 */
export const updateAndroidDynamicWidget = async (
  dynamicWidgetId: string,
  dynamicWidgetProps: AndroidDynamicWidgetProps
): Promise<void> => {
  const dynamicWidgetPropsJson = JSON.stringify(dynamicWidgetProps)

  return getNativeVoltraAndroid().updateAndroidDynamicWidget(dynamicWidgetId, dynamicWidgetPropsJson)
}
