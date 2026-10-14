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

/**
 * Render Dynamic Widgets in a language the app chooses, for apps with their own language setting.
 *
 * The tag (BCP-47, for example `"pl"` or `"pt-BR"`) reaches every render as `env.appLocale`, and
 * `resolveLocale` gives it precedence over the user's system languages. Pass `null` to clear it.
 * Every placed Dynamic Widget re-renders once the value is stored.
 *
 * Android already passes a per-app language set through `LocaleManager` (Android 13+) to widgets
 * as `env.locale`, so this is only needed when the app keeps its own setting.
 */
export const setDynamicWidgetLocale = async (tag: string | null): Promise<void> => {
  return getNativeVoltraAndroid().setDynamicWidgetLocale(normalizeDynamicWidgetLocale(tag))
}

function normalizeDynamicWidgetLocale(tag: string | null): string | null {
  if (tag === null) {
    return null
  }
  if (typeof tag !== 'string') {
    throw new TypeError('setDynamicWidgetLocale expects a BCP-47 language tag or null.')
  }
  const trimmed = tag.trim().replace(/_/g, '-')
  return trimmed.length === 0 ? null : trimmed
}
