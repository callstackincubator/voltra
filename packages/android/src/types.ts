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

/**
 * @deprecated Use `setWidgetServerUpdate` with an `Authorization` header instead. These are
 * stored in the same place and keep the same replace-the-whole-set semantics.
 */
export type WidgetServerCredentials = {
  token: string
  headers?: Record<string, string>
}

/**
 * Runtime overrides for a widget's `serverUpdate` settings — the twin of the `serverUpdate` key
 * in app.json, which supplies the defaults.
 *
 * Every field is optional and replaces the app.json value when set. `headers` and `query` merge
 * per key across layers; everything else takes the value from the most specific layer that sets
 * it. Passing settings without a `widgetId` sets them for every server-driven widget.
 */
export type WidgetServerUpdateSettings = {
  /** Endpoint to fetch from. Must be https, or http to a local dev host in a debug build. */
  url?: string
  /** How often to fetch, in minutes. Clamped to at least 15 and at most 24 hours. */
  intervalMinutes?: number
  /** Set false to stop fetching and drive the widget from the app instead. Defaults to true. */
  enabled?: boolean
  /** HTTP method. Defaults to GET. A body is dropped on GET and HEAD, with a warning. */
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'
  /** Extra query parameters. Voltra's own keys are reserved and rejected. */
  query?: Record<string, string>
  /** Extra request headers, for example `Authorization`. */
  headers?: Record<string, string>
  /** Request body, sent as `application/json`. */
  body?: WidgetServerUpdateBody
}

/** A JSON value, as accepted for a server-update request body. */
export type WidgetServerUpdateBody =
  | string
  | number
  | boolean
  | null
  | WidgetServerUpdateBody[]
  | { [key: string]: WidgetServerUpdateBody }

/** Options selecting which widget a settings call applies to. */
export type WidgetServerUpdateOptions = {
  /** Widget id to scope the settings to. Omit to set them for every server-driven widget. */
  widgetId?: string
}
