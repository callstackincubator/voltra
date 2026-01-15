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
