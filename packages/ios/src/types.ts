export type { VoltraElementJson, VoltraElementRef, VoltraNodeJson, VoltraPropValue } from '@use-voltra/core'

export type EventSubscription = {
  remove: () => void
}

type PreloadImageBaseOptions = {
  key: string
  width?: number
  height?: number
}

export type PreloadImageUrlOptions = PreloadImageBaseOptions & {
  url: string
  method?: 'GET' | 'POST' | 'PUT'
  headers?: Record<string, string>
}

export type PreloadImageSvgOptions = PreloadImageBaseOptions & {
  svg: string
}

export type PreloadImageOptions = PreloadImageUrlOptions | PreloadImageSvgOptions

export type PreloadImageFailure = {
  key: string
  error: string
}

export type PreloadImagesResult = {
  succeeded: string[]
  failed: PreloadImageFailure[]
}

export type UpdateWidgetOptions = {
  deepLinkUrl?: string
}

export type WidgetServerCredentials = {
  token: string
  headers?: Record<string, string>
}
