import { requireNativeModule } from 'expo'

import type { EventSubscription, PreloadImageOptions, PreloadImagesResult, WidgetServerCredentials } from './types.js'

export interface VoltraAndroidModuleSpec {
  startAndroidLiveUpdate(payload: string, options: { updateName?: string; channelId?: string }): Promise<string>
  updateAndroidLiveUpdate(notificationId: string, payload: string): Promise<void>
  stopAndroidLiveUpdate(notificationId: string): Promise<void>
  isAndroidLiveUpdateActive(updateName: string): boolean
  endAllAndroidLiveUpdates(): Promise<void>
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
