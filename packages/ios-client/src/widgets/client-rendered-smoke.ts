import { getNativeVoltra } from '../VoltraModule.js'

/**
 * Temporary smoke-test API for client-rendered widget runtime.
 *
 * Loads a Voltra widget bundle into the shared JSContext on iOS and lets the caller invoke
 * the bundle's `render(props, env)` function. Exists so an in-app screen can verify the
 * JSC runtime end-to-end without depending on WidgetKit.
 *
 * @remarks
 * Do not depend on this API surface — it will be removed once widget-extension wiring is
 * fully covered.
 */

export const voltraWidgetEvalBundle = async (widgetId: string, bundleSource: string): Promise<void> => {
  return getNativeVoltra().voltraWidgetEvalBundle(widgetId, bundleSource)
}

export const voltraWidgetRender = async (widgetId: string, propsJSON: string, envJSON: string): Promise<string> => {
  return getNativeVoltra().voltraWidgetRender(widgetId, propsJSON, envJSON)
}
