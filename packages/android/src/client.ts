export { AndroidOngoingNotification } from './live-update/components.js'

// Android ongoing notification API and types
export {
  canPostPromotedAndroidNotifications,
  endAllAndroidOngoingNotifications,
  getAndroidOngoingNotificationCapabilities,
  getAndroidOngoingNotificationStatus,
  hasAndroidNotificationPermission,
  isAndroidOngoingNotificationActive,
  openAndroidNotificationSettings,
  renderAndroidOngoingNotificationPayload,
  requestAndroidNotificationPermission,
  startAndroidOngoingNotification,
  stopAndroidOngoingNotification,
  upsertAndroidOngoingNotification,
  updateAndroidOngoingNotification,
  useAndroidOngoingNotification,
} from './live-update/api.js'
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

// Android Widget API and types
export {
  clearAllAndroidWidgets,
  clearAndroidWidget,
  getActiveWidgets,
  reloadAndroidWidgets,
  requestPinAndroidWidget,
  updateAndroidWidget,
} from './widgets/api.js'
export type {
  AndroidWidgetSize,
  AndroidWidgetSizeVariant,
  AndroidWidgetVariants,
  UpdateAndroidWidgetOptions,
  WidgetInfo,
} from './widgets/types.js'

// Android Widget Server Credentials API
export {
  clearWidgetServerCredentials,
  setWidgetServerCredentials,
  type WidgetServerCredentials,
} from './widgets/server-credentials.js'

// Preload API
export { clearPreloadedImages, preloadImages, reloadWidgets } from './preload.js'

// Android Preview Components
export { VoltraView, type VoltraViewProps } from './components/VoltraView.js'
export {
  type AndroidWidgetFamily,
  VoltraWidgetPreview,
  type VoltraWidgetPreviewProps,
} from './components/VoltraWidgetPreview.js'
