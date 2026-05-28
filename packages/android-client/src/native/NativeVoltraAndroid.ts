import { TurboModuleRegistry } from 'react-native'
import type { TurboModule } from 'react-native'

type PreloadImageOptions = Readonly<{
  key: string
  url?: string
  svg?: string
  method?: string
  headers?: Readonly<{ [key: string]: string }>
  width?: number
  height?: number
}>

type PreloadImageFailure = Readonly<{
  key: string
  error: string
}>

type PreloadImagesResult = Readonly<{
  succeeded: string[]
  failed: PreloadImageFailure[]
}>

type WidgetServerCredentials = Readonly<{
  token: string
  headers?: Readonly<{ [key: string]: string }>
}>

type StartAndroidOngoingNotificationOptionsSpec = Readonly<{
  notificationId?: string
  channelId: string
  smallIcon?: string
  deepLinkUrl?: string
  requestPromotedOngoing?: boolean
  fallbackBehavior?: string
}>

type UpdateAndroidOngoingNotificationOptionsSpec = Readonly<{
  channelId?: string
  smallIcon?: string
  deepLinkUrl?: string
  requestPromotedOngoing?: boolean
  fallbackBehavior?: string
}>

type AndroidOngoingNotificationResultSpec = Readonly<{
  ok: boolean
  notificationId: string
  action?: string
  reason?: string
}>

type AndroidOngoingNotificationStatusSpec = Readonly<{
  isActive: boolean
  isDismissed: boolean
  isPromoted?: boolean
  hasPromotableCharacteristics?: boolean
}>

type AndroidOngoingNotificationCapabilitiesSpec = Readonly<{
  apiLevel: number
  notificationsEnabled: boolean
  supportsPromotedNotifications: boolean
  canPostPromotedNotifications: boolean
  canRequestPromotedOngoing: boolean
}>

type RequestPinGlanceAppWidgetOptionsSpec = Readonly<{
  previewWidth?: number
  previewHeight?: number
}>

export interface Spec extends TurboModule {
  startAndroidOngoingNotification(
    payload: string,
    options: StartAndroidOngoingNotificationOptionsSpec
  ): Promise<AndroidOngoingNotificationResultSpec>
  upsertAndroidOngoingNotification(
    payload: string,
    options: StartAndroidOngoingNotificationOptionsSpec
  ): Promise<AndroidOngoingNotificationResultSpec>
  updateAndroidOngoingNotification(
    notificationId: string,
    payload: string,
    options?: UpdateAndroidOngoingNotificationOptionsSpec
  ): Promise<AndroidOngoingNotificationResultSpec>
  stopAndroidOngoingNotification(notificationId: string): Promise<AndroidOngoingNotificationResultSpec>
  isAndroidOngoingNotificationActive(notificationId: string): boolean
  getAndroidOngoingNotificationStatus(notificationId: string): AndroidOngoingNotificationStatusSpec
  endAllAndroidOngoingNotifications(): Promise<void>
  canPostPromotedAndroidNotifications(): boolean
  getAndroidOngoingNotificationCapabilities(): AndroidOngoingNotificationCapabilitiesSpec
  openAndroidNotificationSettings(): Promise<void>
  updateAndroidWidget(widgetId: string, jsonString: string, options?: Readonly<{ deepLinkUrl?: string }>): Promise<void>
  reloadAndroidWidgets(widgetIds?: string[] | null): Promise<void>
  clearAndroidWidget(widgetId: string): Promise<void>
  clearAllAndroidWidgets(): Promise<void>
  requestPinGlanceAppWidget(widgetId: string, options?: RequestPinGlanceAppWidgetOptionsSpec): Promise<boolean>
  preloadImages(images: PreloadImageOptions[]): Promise<PreloadImagesResult>
  clearPreloadedImages(keys?: string[] | null): Promise<void>
  setWidgetServerCredentials(credentials: WidgetServerCredentials): Promise<void>
  clearWidgetServerCredentials(): Promise<void>
  getActiveWidgets(): Promise<ReadonlyArray<object>>
}

export function getNativeVoltraAndroid(): Spec {
  const voltraModule = TurboModuleRegistry.get<Spec>('NativeVoltraAndroid')

  if (voltraModule == null) {
    throw new Error('NativeVoltraAndroid is not available')
  }

  return voltraModule
}
