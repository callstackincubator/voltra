// Android component namespace
import * as VoltraAndroid from './jsx/primitives.js'

export { VoltraAndroid }
export { AndroidDynamicColors } from './dynamic-colors.js'
export {
  getAndroidComponentId,
  getAndroidComponentName,
  ANDROID_COMPONENT_ID_TO_NAME,
  ANDROID_COMPONENT_NAME_TO_ID,
} from './payload/component-ids.js'
export { AndroidOngoingNotification } from './ongoing-notification/components.js'
export { renderAndroidOngoingNotificationPayload } from './ongoing-notification/renderer.js'
export { renderAndroidViewToJson, renderAndroidWidgetToJson, renderAndroidWidgetToString } from './widgets/renderer.js'
// Single-node renderer used by Dynamic Widgets (on-device Hermes render). Analog of
// iOS `renderVoltraVariantToJson`. Invoked with `(props, env)` per render via the generated
// widget entry.
export { renderAndroidVariantToJson } from './renderer/index.js'

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
  EventSubscription,
  PreloadImageFailure,
  PreloadImageOptions,
  PreloadImageSvgOptions,
  PreloadImageUrlOptions,
  PreloadImagesResult,
  VoltraElementJson,
  VoltraElementRef,
  VoltraNodeJson,
  VoltraPropValue,
  WidgetServerCredentials,
  WidgetServerUpdateBody,
  WidgetServerUpdateOptions,
  WidgetServerUpdateSettings,
  WidgetServerUpdateSnapshot,
} from './types.js'
export type {
  AndroidWidgetSize,
  AndroidWidgetSizeVariant,
  AndroidWidgetVariants,
  UpdateAndroidWidgetOptions,
  WidgetInfo,
} from './widgets/types.js'

export type {
  AndroidOngoingNotificationActionPayload,
  AndroidOngoingNotificationActionProps,
  AndroidOngoingNotificationBigPicturePayload,
  AndroidOngoingNotificationBigPictureProps,
  AndroidOngoingNotificationBigTextPayload,
  AndroidOngoingNotificationBigTextProps,
  AndroidOngoingNotificationCapabilities,
  AndroidOngoingNotificationCategory,
  AndroidOngoingNotificationCheckPromotionResult,
  AndroidOngoingNotificationChronometer,
  AndroidOngoingNotificationCommonDisplayProps,
  AndroidOngoingNotificationContent,
  AndroidOngoingNotificationFallbackBehavior,
  AndroidOngoingNotificationInboxPayload,
  AndroidOngoingNotificationInboxProps,
  AndroidOngoingNotificationInput,
  AndroidOngoingNotificationMetricDescriptor,
  AndroidOngoingNotificationMetricEntryPayload,
  AndroidOngoingNotificationMetricPayload,
  AndroidOngoingNotificationMetricProps,
  AndroidOngoingNotificationMetricSemanticStyle,
  AndroidOngoingNotificationMetricTimeFormat,
  AndroidOngoingNotificationMetricValue,
  AndroidOngoingNotificationMetricValuePayload,
  AndroidOngoingNotificationPayload,
  AndroidOngoingNotificationPresentationOptions,
  AndroidOngoingNotificationProgressPayload,
  AndroidOngoingNotificationProgressPoint,
  AndroidOngoingNotificationProgressProps,
  AndroidOngoingNotificationProgressSegment,
  AndroidOngoingNotificationPromotionInfo,
  AndroidOngoingNotificationPromotionIssue,
  AndroidOngoingNotificationPublicVersion,
  AndroidOngoingNotificationStartResult,
  AndroidOngoingNotificationStatus,
  AndroidOngoingNotificationStopResult,
  AndroidOngoingNotificationStyleFallback,
  AndroidOngoingNotificationUpdateResult,
  AndroidOngoingNotificationUpsertResult,
  AndroidOngoingNotificationVisibility,
  CheckAndroidOngoingNotificationPromotionOptions,
  StartAndroidOngoingNotificationOptions,
  UpdateAndroidOngoingNotificationOptions,
  UpsertAndroidOngoingNotificationOptions,
  UseAndroidOngoingNotificationOptions,
  UseAndroidOngoingNotificationResult,
} from './ongoing-notification/types.js'
export {
  ANDROID_ONGOING_NOTIFICATION_CATEGORIES,
  ANDROID_ONGOING_NOTIFICATION_VISIBILITIES,
} from './ongoing-notification/types.js'

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
export {
  getFastRefreshHub,
  isAndroidEnv,
  isIosEnv,
  pickLocalizedValue,
  resolveLocale,
  useUpdateOnHMR,
} from '@use-voltra/core'
export type { FastRefreshHub, LocaleEnvironment, WidgetBuildEnvironment, WidgetEnvironment } from '@use-voltra/core'
