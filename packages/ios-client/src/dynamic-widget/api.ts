import { getNativeVoltra } from '../native/NativeVoltra.js'
import { assertRunningOnApple } from '../utils/assertRunningOnApple.js'

export type DynamicWidgetPropsValue =
  | string
  | number
  | boolean
  | null
  | ReadonlyArray<DynamicWidgetPropsValue>
  | Readonly<{ [dynamicWidgetPropName: string]: DynamicWidgetPropsValue }>

export type DynamicWidgetProps = Readonly<{
  [dynamicWidgetPropName: string]: DynamicWidgetPropsValue
}>

export const updateDynamicWidget = async (
  dynamicWidgetId: string,
  dynamicWidgetProps: DynamicWidgetProps
): Promise<void> => {
  if (!assertRunningOnApple()) return Promise.resolve()

  const dynamicWidgetPropsJson = JSON.stringify(dynamicWidgetProps)

  return getNativeVoltra().updateDynamicWidget(dynamicWidgetId, dynamicWidgetPropsJson)
}
