export type VoltraPropValue = string | number | boolean | null | VoltraNodeJson

export type VoltraElementJson = {
  t: number
  i?: string
  c?: VoltraNodeJson
  p?: Record<string, VoltraPropValue>
}

export type VoltraElementRef = {
  $r: number
}

export type VoltraNodeJson = VoltraElementJson | VoltraElementJson[] | VoltraElementRef | string

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
