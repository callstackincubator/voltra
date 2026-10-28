import { registerVoltraHeadlessTask } from './headless-task.js'

export {
  AndroidDynamicColors,
  AndroidOngoingNotification,
  renderAndroidOngoingNotificationPayload,
  VoltraAndroid,
} from '@use-voltra/android'
export {
  canPostPromotedAndroidNotifications,
  checkAndroidOngoingNotificationPromotion,
  endAllAndroidOngoingNotifications,
  getAndroidOngoingNotificationCapabilities,
  getAndroidOngoingNotificationStatus,
  hasAndroidNotificationPermission,
  isAndroidOngoingNotificationActive,
  openAndroidNotificationSettings,
  openAndroidPromotedNotificationSettings,
  requestAndroidNotificationPermission,
  startAndroidOngoingNotification,
  stopAndroidOngoingNotification,
  upsertAndroidOngoingNotification,
  updateAndroidOngoingNotification,
  useAndroidOngoingNotification,
} from './ongoing-notification/api.js'
export type {
  AndroidOngoingNotificationActionPayload,
  AndroidOngoingNotificationActionProps,
  AndroidOngoingNotificationDeepLinkActionProps,
  AndroidOngoingNotificationEventActionProps,
  AndroidOngoingNotificationRemoteInput,
  AndroidOngoingNotificationSemanticAction,
  AndroidOngoingNotificationBigTextPayload,
  AndroidOngoingNotificationBigTextProps,
  AndroidOngoingNotificationCapabilities,
  AndroidOngoingNotificationCategory,
  AndroidOngoingNotificationCheckPromotionResult,
  AndroidOngoingNotificationChronometer,
  AndroidOngoingNotificationCommonDisplayProps,
  AndroidOngoingNotificationContent,
  AndroidOngoingNotificationFallbackBehavior,
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
} from '@use-voltra/android'
export {
  setDynamicWidgetLocale,
  updateAndroidDynamicWidget,
  type AndroidDynamicWidgetProps,
  type AndroidDynamicWidgetPropsValue,
} from './dynamic-widget/api.js'
export {
  clearWidgetServerUpdate,
  getWidgetServerUpdate,
  setWidgetServerUpdate,
  type WidgetServerUpdateBody,
  type WidgetServerUpdateOptions,
  type WidgetServerUpdateSettings,
  type WidgetServerUpdateSnapshot,
} from './widgets/server-update.js'
export {
  clearAllAndroidWidgets,
  clearAndroidWidget,
  clearWidgetInstanceConfiguration,
  getActiveWidgets,
  getWidgetConfiguration,
  getWidgetInstanceConfiguration,
  reloadAndroidWidgets,
  requestPinAndroidWidget,
  setWidgetConfiguration,
  setWidgetInstanceConfiguration,
  updateAndroidWidget,
} from './widgets/api.js'
export type {
  AndroidWidgetSize,
  AndroidWidgetSizeVariant,
  AndroidWidgetVariants,
  UpdateAndroidWidgetOptions,
  WidgetInfo,
} from '@use-voltra/android'
export {
  clearWidgetServerCredentials,
  setWidgetServerCredentials,
  type WidgetServerCredentials,
} from './widgets/server-credentials.js'
export { clearPreloadedImages, preloadImages, reloadWidgets } from './preload.js'
export * from './events.js'

// A notification action pressed while the app is in the background starts this task (ADR 0015); it
// has to be registered before the app's own entry point finishes.
registerVoltraHeadlessTask()
export { VoltraView, type VoltraViewInteractionEvent, type VoltraViewProps } from './components/VoltraView.js'
export {
  type AndroidWidgetFamily,
  VoltraWidgetPreview,
  type VoltraWidgetPreviewProps,
} from './components/VoltraWidgetPreview.js'
export { enableWidgetHotReload } from './utils/enableWidgetHotReload.js'
