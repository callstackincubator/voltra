import { requireNativeModule } from 'expo'

import type {
  StartAndroidOngoingNotificationOptions,
  UpdateAndroidOngoingNotificationOptions,
} from '@use-voltra/android'
import type { EventSubscription, PreloadImageOptions, PreloadImagesResult, WidgetServerCredentials } from './types.js'

export interface VoltraAndroidModuleSpec {
  startAndroidLiveUpdate(payload: string, options: { updateName?: string; channelId?: string }): Promise<string>
  updateAndroidLiveUpdate(notificationId: string, payload: string): Promise<void>
  stopAndroidLiveUpdate(notificationId: string): Promise<void>
  isAndroidLiveUpdateActive(updateName: string): boolean
  endAllAndroidLiveUpdates(): Promise<void>
  startAndroidOngoingNotification(
    payload: string,
    options: StartAndroidOngoingNotificationOptions
  ): Promise<{
    ok: boolean
    notificationId: string
    action?: 'started'
    reason?: 'already_exists'
  }>
  upsertAndroidOngoingNotification(
    payload: string,
    options: StartAndroidOngoingNotificationOptions
  ): Promise<{
    ok: boolean
    notificationId: string
    action?: 'started' | 'updated'
    reason?: 'already_exists' | 'dismissed'
  }>
  updateAndroidOngoingNotification(
    notificationId: string,
    payload: string,
    options?: UpdateAndroidOngoingNotificationOptions
  ): Promise<{
    ok: boolean
    notificationId: string
    action?: 'updated'
    reason?: 'dismissed' | 'not_found'
  }>
  stopAndroidOngoingNotification(notificationId: string): Promise<{
    ok: boolean
    notificationId: string
    action?: 'stopped'
    reason?: 'not_found'
  }>
  isAndroidOngoingNotificationActive(notificationId: string): boolean
  getAndroidOngoingNotificationStatus(notificationId: string): {
    isActive: boolean
    isDismissed: boolean
    isPromoted?: boolean
    hasPromotableCharacteristics?: boolean
  }
  endAllAndroidOngoingNotifications(): Promise<void>
  canPostPromotedAndroidNotifications(): boolean
  getAndroidOngoingNotificationCapabilities(): {
    apiLevel: number
    notificationsEnabled: boolean
    supportsPromotedNotifications: boolean
    canPostPromotedNotifications: boolean
    canRequestPromotedOngoing: boolean
  }
  openAndroidNotificationSettings(): Promise<void>
  updateAndroidWidget(widgetId: string, jsonString: string, options?: { deepLinkUrl?: string }): Promise<void>
  reloadAndroidWidgets(widgetIds?: string[] | null): Promise<void>
  clearAndroidWidget(widgetId: string): Promise<void>
  clearAllAndroidWidgets(): Promise<void>
  requestPinGlanceAppWidget(
    widgetId: string,
    options?: { previewWidth?: number; previewHeight?: number }
  ): Promise<boolean>
  preloadImages(images: PreloadImageOptions[]): Promise<PreloadImagesResult>
  clearPreloadedImages(keys?: string[] | null): Promise<void>
  setWidgetServerCredentials(credentials: WidgetServerCredentials): Promise<void>
  clearWidgetServerCredentials(): Promise<void>
  getActiveWidgets<T = any>(): Promise<T[]>
  addListener(event: string, listener: (event: any) => void): EventSubscription
}

const VoltraModule = requireNativeModule<VoltraAndroidModuleSpec>('VoltraModule')

export default VoltraModule
