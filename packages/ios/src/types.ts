export type {
  ResolvableCondition,
  ResolvableEnvironmentKey,
  ResolvableEnvironmentValueMap,
  ResolvableValue,
  ResolvableWidgetRenderingMode,
  VoltraElementJson,
  VoltraElementRef,
  VoltraNodeJson,
  VoltraPropValue,
} from '@use-voltra/core'

export type EventSubscription = {
  remove: () => void
}

export type PreloadImageOptions = {
  url: string
  key: string
  method?: 'GET' | 'POST' | 'PUT'
  headers?: Record<string, string>
}

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
