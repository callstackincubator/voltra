// Android component namespace
export * as VoltraAndroid from './jsx/primitives.js'

// Android types
export type { VoltraAndroidBaseProps } from './jsx/baseProps.js'
export type {
  VoltraAndroidStyleProp,
  VoltraAndroidTextStyle,
  VoltraAndroidTextStyleProp,
  VoltraAndroidViewStyle,
} from './styles/types.js'

// Component prop types
export type { BoxProps } from './jsx/Box.js'
export type { ButtonProps } from './jsx/Button.js'
export type { CircularProgressIndicatorProps } from './jsx/CircularProgressIndicator.js'
export type { ColumnProps } from './jsx/Column.js'
export type { ImageProps } from './jsx/Image.js'
export type { LinearProgressIndicatorProps } from './jsx/LinearProgressIndicator.js'
export type { RowProps } from './jsx/Row.js'
export type { SpacerProps } from './jsx/Spacer.js'
export type { TextProps } from './jsx/Text.js'

// Android Live Update API and types
export {
  unstable_endAllAndroidLiveUpdates,
  unstable_isAndroidLiveUpdateActive,
  unstable_startAndroidLiveUpdate,
  unstable_stopAndroidLiveUpdate,
  unstable_updateAndroidLiveUpdate,
  unstable_useAndroidLiveUpdate,
} from './live-update/api.js'
export type {
  AndroidLiveUpdateJson,
  AndroidLiveUpdateVariants,
  AndroidLiveUpdateVariantsJson,
  StartAndroidLiveUpdateOptions,
  UpdateAndroidLiveUpdateOptions,
  UseAndroidLiveUpdateOptions,
  UseAndroidLiveUpdateResult,
} from './live-update/types.js'
