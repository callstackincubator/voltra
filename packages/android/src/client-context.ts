import VoltraModule from './VoltraModule.js'
import { createAndroidWidgetRenderContextValue } from './dynamic-color.js'

export const getClientAndroidWidgetRenderContextValue = () => {
  const palette = VoltraModule.getAndroidDynamicColorPalette()

  return createAndroidWidgetRenderContextValue(palette)
}
