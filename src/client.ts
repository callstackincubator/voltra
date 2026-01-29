// Helpers API
export { isGlassSupported, isHeadless } from './helpers.js'

// Events API
export * from './events.js'

// Preview API
export {
  VoltraLiveActivityPreview,
  type VoltraLiveActivityPreviewProps,
} from './components/VoltraLiveActivityPreview.js'
export { VoltraView, type VoltraViewProps } from './components/VoltraView.js'
export { VoltraWidgetPreview, type VoltraWidgetPreviewProps } from './components/VoltraWidgetPreview.js'

// Renderer API
export type { VoltraElementJson, VoltraNodeJson } from './types.js'

// Preload API
export {
  clearPreloadedImages,
  type PreloadImageOptions,
  preloadImages,
  type PreloadImagesResult,
  reloadLiveActivities,
} from './preload.js'

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
} from './live-activity/api.js'
export type { DismissalPolicy, LiveActivityVariants } from './live-activity/types.js'

// Widget API
export type { WidgetFamily, WidgetInfo, WidgetVariants } from './widgets/types.js'
export {
  clearAllWidgets,
  clearWidget,
  getActiveWidgets,
  reloadWidgets,
  type ScheduledWidgetEntry,
  scheduleWidget,
  updateWidget,
  type UpdateWidgetOptions,
} from './widgets/widget-api.js'
