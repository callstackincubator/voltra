import {
  createAndroidWidgetRenderContextValue,
  parseAndroidDynamicColorPalette,
  type AndroidWidgetRenderContextValue,
} from './dynamic-color.js'

type AndroidWidgetRenderRequestLike = {
  url: URL
}

export const createAndroidWidgetRenderContext = (
  request: AndroidWidgetRenderRequestLike
): AndroidWidgetRenderContextValue => {
  return createAndroidWidgetRenderContextValue(
    parseAndroidDynamicColorPalette(request.url.searchParams.get('androidPalette'))
  )
}
