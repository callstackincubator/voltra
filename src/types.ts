export type VoltraPropValue = string | number | boolean | null | VoltraNodeJson // Allow component trees in props

export type VoltraElementJson = {
  t: number
  i?: string
  c?: VoltraNodeJson
  p?: Record<string, VoltraPropValue>
}

/**
 * Reference to a shared element by index.
 * Used for element deduplication - when the same JSX element (by reference)
 * appears multiple times in the tree.
 */
export type VoltraElementRef = {
  $r: number
}

export type VoltraNodeJson = VoltraElementJson | VoltraElementJson[] | VoltraElementRef | string

/**
 * Event subscription interface
 */
export type EventSubscription = {
  remove: () => void
}

/**
 * Options for preloading a single image
 */
export type PreloadImageOptions = {
  /**
   * The URL to download the image from
   */
  url: string
  /**
   * The key to use when referencing this image (used as assetName in Image component)
   */
  key: string
  /**
   * HTTP method to use. Defaults to 'GET'.
   */
  method?: 'GET' | 'POST' | 'PUT'
  /**
   * Optional HTTP headers to include in the request
   */
  headers?: Record<string, string>
}

/**
 * Result of a failed image preload
 */
export type PreloadImageFailure = {
  key: string
  error: string
}

/**
 * Result of preloading images
 */
export type PreloadImagesResult = {
  /**
   * Keys of images that were successfully preloaded
   */
  succeeded: string[]
  /**
   * Images that failed to preload, with error messages
   */
  failed: PreloadImageFailure[]
}

/**
 * Options for updating a home screen widget
 */
export type UpdateWidgetOptions = {
  /**
   * URL to open when the widget is tapped.
   * Can be a full URL (e.g., "myapp://screen/details")
   * or a path that will be prefixed with your app's URL scheme.
   */
  deepLinkUrl?: string
}
