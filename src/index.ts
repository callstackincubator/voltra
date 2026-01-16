// iOS namespace and types
export * as Voltra from './jsx/primitives.js'
export type { LiveActivityVariants } from './live-activity/types.js'
export type { WidgetVariants } from './widgets/types.js'

// Android namespace and types (unstable)
export type {
  AndroidLiveUpdateJson,
  AndroidLiveUpdateVariants,
  AndroidLiveUpdateVariantsJson,
  StartAndroidLiveUpdateOptions,
  UpdateAndroidLiveUpdateOptions,
  UseAndroidLiveUpdateOptions,
  UseAndroidLiveUpdateResult,
  VoltraAndroidBaseProps,
  VoltraAndroidStyleProp,
  VoltraAndroidTextStyle,
  VoltraAndroidTextStyleProp,
  VoltraAndroidViewStyle,
} from './android/index.js'
export * as VoltraAndroid from './android/jsx/primitives.js'
export { unstable_useAndroidLiveUpdate } from './android/live-update/api.js'
export { unstable_startAndroidLiveUpdate } from './android/live-update/api.js'
export { unstable_updateAndroidLiveUpdate } from './android/live-update/api.js'
export { unstable_stopAndroidLiveUpdate } from './android/live-update/api.js'
export { unstable_isAndroidLiveUpdateActive } from './android/live-update/api.js'
export { unstable_endAllAndroidLiveUpdates } from './android/live-update/api.js'
