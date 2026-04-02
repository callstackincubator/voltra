// Android component namespace
export * as VoltraAndroid from './jsx/primitives.js'
export { AndroidDynamicColors } from './dynamic-colors.js'
export { renderAndroidLiveUpdateToJson, renderAndroidLiveUpdateToString } from './live-update/renderer.js'
export { renderAndroidViewToJson, renderAndroidWidgetToJson, renderAndroidWidgetToString } from './widgets/renderer.js'

// Android types
export type { VoltraAndroidBaseProps } from './jsx/baseProps.js'
export type {
  VoltraAndroidStyleProp,
  VoltraAndroidTextStyle,
  VoltraAndroidTextStyleProp,
  VoltraAndroidViewStyle,
} from './styles/types.js'
export type { AndroidColorValue, AndroidDynamicColorRole, AndroidDynamicColorToken } from './dynamic-colors.js'
export type {
  AndroidLiveUpdateJson,
  AndroidLiveUpdateVariants,
  AndroidLiveUpdateVariantsJson,
  StartAndroidLiveUpdateOptions,
  UpdateAndroidLiveUpdateOptions,
  UseAndroidLiveUpdateOptions,
  UseAndroidLiveUpdateResult,
} from './live-update/types.js'
export type {
  EventSubscription,
  PreloadImageFailure,
  PreloadImageOptions,
  PreloadImagesResult,
  VoltraElementJson,
  VoltraElementRef,
  VoltraNodeJson,
  VoltraPropValue,
  WidgetServerCredentials,
} from './types.js'
export type {
  AndroidWidgetSize,
  AndroidWidgetSizeVariant,
  AndroidWidgetVariants,
  UpdateAndroidWidgetOptions,
  WidgetInfo,
} from './widgets/types.js'

// Component prop types
export type { BoxProps } from './jsx/Box.js'
export type { ButtonProps } from './jsx/Button.js'
export type { CircularProgressIndicatorProps } from './jsx/CircularProgressIndicator.js'
export type { ColumnProps } from './jsx/Column.js'
export type { ImageProps } from './jsx/Image.js'
export type { LazyColumnProps } from './jsx/LazyColumn.js'
export type { LazyVerticalGridProps } from './jsx/LazyVerticalGrid.js'
export type { LinearProgressIndicatorProps } from './jsx/LinearProgressIndicator.js'
export type { RowProps } from './jsx/Row.js'
export type { SpacerProps } from './jsx/Spacer.js'
export type { TextProps } from './jsx/Text.js'
