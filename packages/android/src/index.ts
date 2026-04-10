// Android component namespace
export * as VoltraAndroid from './jsx/primitives.js'
export { AndroidDynamicColors } from './dynamic-colors.js'
export { AndroidOngoingNotification } from './live-update/components.js'

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
  AndroidOngoingNotificationActionPayload,
  AndroidOngoingNotificationActionProps,
  AndroidOngoingNotificationBigTextPayload,
  AndroidOngoingNotificationBigTextProps,
  AndroidOngoingNotificationCapabilities,
  AndroidOngoingNotificationCommonDisplayProps,
  AndroidOngoingNotificationContent,
  AndroidOngoingNotificationFallbackBehavior,
  AndroidOngoingNotificationInput,
  AndroidOngoingNotificationPayload,
  AndroidOngoingNotificationProgressPayload,
  AndroidOngoingNotificationProgressPoint,
  AndroidOngoingNotificationProgressProps,
  AndroidOngoingNotificationProgressSegment,
  AndroidOngoingNotificationStartResult,
  AndroidOngoingNotificationStatus,
  AndroidOngoingNotificationStopResult,
  AndroidOngoingNotificationUpdateResult,
  AndroidOngoingNotificationUpsertResult,
  StartAndroidOngoingNotificationOptions,
  UpdateAndroidOngoingNotificationOptions,
  UseAndroidOngoingNotificationOptions,
  UseAndroidOngoingNotificationResult,
} from './live-update/types.js'

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
