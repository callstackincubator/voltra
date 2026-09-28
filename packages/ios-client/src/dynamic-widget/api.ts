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

/**
 * Render Dynamic Widgets and Dynamic Live Activities in a language the app chooses.
 *
 * iOS 17 and 18 do not pass a per-app language chosen in Settings to widget extensions, and apps
 * with their own language setting have no other way to reach them. The tag (BCP-47, for example
 * `"pl"` or `"pt-BR"`) is stored in the App Group and reaches every render as `env.appLocale`;
 * `resolveLocale` gives it precedence over the user's system languages. Pass `null` to clear it.
 *
 * Widgets reload and running Dynamic Live Activities re-render once the value is stored.
 * Requires `groupIdentifier` in the Voltra config plugin, and rejects without one.
 */
export const setDynamicWidgetLocale = async (tag: string | null): Promise<void> => {
  if (!assertRunningOnApple()) return Promise.resolve()

  return getNativeVoltra().setDynamicWidgetLocale(normalizeDynamicWidgetLocale(tag))
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
