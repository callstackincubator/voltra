import { requireNativeModule } from 'expo'

import type {
  EventSubscription,
  PreloadImageOptions,
  PreloadImagesResult,
  UpdateWidgetOptions,
  WidgetServerCredentials,
} from './types.js'

export type StartVoltraOptions = {
  target?: string
  deepLinkUrl?: string
  activityId?: string
  staleDate?: number
  relevanceScore?: number
  channelId?: string
}

export type UpdateVoltraOptions = {
  staleDate?: number
  relevanceScore?: number
}

export type EndVoltraOptions = {
  dismissalPolicy?: {
    type: 'immediate' | 'after'
    date?: number
  }
}

export interface VoltraIOSModuleSpec {
  startLiveActivity(jsonString: string, options?: StartVoltraOptions): Promise<string>
  updateLiveActivity(activityId: string, jsonString: string, options?: UpdateVoltraOptions): Promise<void>
  endLiveActivity(activityId: string, options?: EndVoltraOptions): Promise<void>
  endAllLiveActivities(): Promise<void>
  getLatestVoltraActivityId(): Promise<string | null>
  listVoltraActivityIds(): Promise<string[]>
  isLiveActivityActive(activityName: string): boolean
  isHeadless(): boolean
  preloadImages(images: PreloadImageOptions[]): Promise<PreloadImagesResult>
  reloadLiveActivities(activityNames?: string[] | null): Promise<void>
  clearPreloadedImages(keys?: string[] | null): Promise<void>
  updateWidget(widgetId: string, jsonString: string, options?: UpdateWidgetOptions): Promise<void>
  scheduleWidget(widgetId: string, timelineJson: string): Promise<void>
  reloadWidgets(widgetIds?: string[] | null): Promise<void>
  clearWidget(widgetId: string): Promise<void>
  clearAllWidgets(): Promise<void>
  getActiveWidgets<T = any>(): Promise<T[]>
  setWidgetServerCredentials(credentials: WidgetServerCredentials): Promise<void>
  clearWidgetServerCredentials(): Promise<void>
  addListener(event: string, listener: (event: any) => void): EventSubscription
}

const VoltraModule = requireNativeModule<VoltraIOSModuleSpec>('VoltraModule')

export default VoltraModule
