// Helpers API
export { isGlassSupported, isHeadless } from './helpers'

// Primitives API
export * as Voltra from './jsx/primitives'

// Events API
export * from './events'

// Preview API
export { VoltraLiveActivityPreview, type VoltraLiveActivityPreviewProps } from './components/VoltraLiveActivityPreview'
export { VoltraView, type VoltraViewProps } from './components/VoltraView'
export { VoltraWidgetPreview, type VoltraWidgetPreviewProps } from './components/VoltraWidgetPreview'

// Renderer API
export type { VoltraVariants } from './renderer'
export type { VoltraElementJson, VoltraJson, VoltraNodeJson, VoltraVariantsJson } from './types'

// Preload API
export {
  clearPreloadedImages,
  type PreloadImageOptions,
  preloadImages,
  type PreloadImagesResult,
  reloadLiveActivities,
} from './preload'

// Live Activity API
export {
  endAllLiveActivities,
  type EndLiveActivityOptions,
  isLiveActivityActive,
  type SharedLiveActivityOptions,
  startLiveActivity,
  type StartLiveActivityOptions,
  stopLiveActivity,
  updateLiveActivity,
  type UpdateLiveActivityOptions,
  useLiveActivity,
  type UseLiveActivityOptions,
  type UseLiveActivityResult,
} from './liveactivity-api'

// Widget API
export {
  clearAllWidgets,
  clearWidget,
  reloadWidgets,
  updateWidget,
  type UpdateWidgetOptions,
  type WidgetContent,
  type WidgetFamily,
  type WidgetVariants,
} from './widget-api'
