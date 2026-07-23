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

export const updateAndroidDynamicWidget = async (
  dynamicWidgetId: string,
  dynamicWidgetProps: AndroidDynamicWidgetProps
): Promise<void> => {
  const dynamicWidgetPropsJson = JSON.stringify(dynamicWidgetProps)

  return getNativeVoltraAndroid().updateAndroidDynamicWidget(dynamicWidgetId, dynamicWidgetPropsJson)
}
