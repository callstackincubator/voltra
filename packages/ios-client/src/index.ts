export { Voltra } from '@use-voltra/ios'
export {
  VoltraLiveActivityPreview,
  type VoltraLiveActivityPreviewProps,
} from './components/VoltraLiveActivityPreview.js'
export { VoltraView, type VoltraViewProps } from './components/VoltraView.js'
export { VoltraWidgetPreview, type VoltraWidgetPreviewProps } from './components/VoltraWidgetPreview.js'
export * from './events.js'
export { isGlassSupported, isHeadless, useIsHeadless } from './helpers.js'
export { logger, type VoltraLogLevel } from './logger.js'
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
export type { DismissalPolicy, LiveActivityVariants } from '@use-voltra/ios'
export {
  clearPreloadedImages,
  type PreloadImageOptions,
  preloadImages,
  type PreloadImagesResult,
  reloadLiveActivities,
} from './preload.js'
export { assertRunningOnApple } from './utils/assertRunningOnApple.js'
export { enableWidgetHotReload } from './utils/enableWidgetHotReload.js'
export { useUpdateOnHMR } from './utils/useUpdateOnHMR.js'
export * from './utils/helpers.js'
export type { VoltraElementJson, VoltraNodeJson } from './types.js'
export {
  clearWidgetServerCredentials,
  setWidgetServerCredentials,
  type WidgetServerCredentials,
} from './widgets/server-credentials.js'
export type { WidgetFamily, WidgetInfo, WidgetVariants } from '@use-voltra/ios'
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
// Temporary smoke-test surface. Removed once widget-extension wiring is fully covered.
export { voltraWidgetEvalBundle, voltraWidgetRender } from './widgets/client-rendered-smoke.js'
