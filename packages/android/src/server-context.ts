import {
  createAndroidWidgetRenderContextValue,
  type AndroidWidgetRenderContextValue,
  type AndroidWidgetRenderTheme,
} from './dynamic-color.js'

type AndroidWidgetRenderRequestLike = {
  theme: AndroidWidgetRenderTheme
  url: URL
}

export const createAndroidWidgetRenderContext = (
  request: AndroidWidgetRenderRequestLike
) : AndroidWidgetRenderContextValue => {
  return createAndroidWidgetRenderContextValue(request.theme, request.url.searchParams.get('androidPalette'))
}
