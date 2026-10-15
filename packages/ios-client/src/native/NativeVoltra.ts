import type { CodegenTypes, TurboModule } from 'react-native'
import { TurboModuleRegistry } from 'react-native'

type VoltraActivityTokenReceivedEvent = Readonly<{
  source: string
  timestamp: number
  type: 'activityTokenReceived'
  activityName: string
  pushToken: string
}>

type VoltraActivityPushToStartTokenReceivedEvent = Readonly<{
  source: string
  timestamp: number
  type: 'activityPushToStartTokenReceived'
  pushToStartToken: string
}>

type VoltraActivityEnablementChangedEvent = Readonly<{
  source: string
  timestamp: number
  type: 'activityEnablementChanged'
  enabled: boolean
}>

type LiveActivityPushToken = Readonly<{
  activityName: string
  pushToken: string
}>

type VoltraActivityUpdateEvent = Readonly<{
  source: string
  timestamp: number
  type: 'stateChange'
  activityName: string
  activityState: string
}>

type VoltraInteractionEvent = Readonly<{
  source: string
  timestamp: number
  type: 'interaction'
  identifier: string
  payload: string
}>

type QueuedVoltraInteraction = Readonly<{
  type: string
  id: string
  source: string
  timestamp: number
  identifier: string
  payload: string
}>

type VoltraInteractionsAvailableEvent = Readonly<{
  type: string
}>

type VoltraDynamicLiveActivityRenderFailedEvent = Readonly<{
  source: string
  timestamp: number
  type: 'dynamicLiveActivityRenderFailed'
  activityName: string
  definitionId: string
  message: string
}>

type StartVoltraOptions = Readonly<{
  target?: string
  deepLinkUrl?: string
  activityName?: string
  staleDate?: number
  relevanceScore?: number
  channelId?: string
}>

type UpdateVoltraOptions = Readonly<{
  staleDate?: number
  relevanceScore?: number
}>

type DismissalPolicyOptions = Readonly<{
  type: string
  date?: number
}>

type EndVoltraOptions = Readonly<{
  dismissalPolicy?: DismissalPolicyOptions
}>

type UpdateWidgetOptions = Readonly<{
  deepLinkUrl?: string
}>

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

export interface Spec extends TurboModule {
  /** Native builds before the interaction queue (ADR 0011) emit taps here; current builds never do. */
  readonly onInteraction: CodegenTypes.EventEmitter<VoltraInteractionEvent>
  /** Internal: a tap was recorded in the interaction queue. Carries no tap data; call `popInteractions`. */
  readonly onInteractionsAvailable: CodegenTypes.EventEmitter<VoltraInteractionsAvailableEvent>
  readonly onDynamicLiveActivityRenderFailed: CodegenTypes.EventEmitter<VoltraDynamicLiveActivityRenderFailedEvent>
  readonly onStateChanged: CodegenTypes.EventEmitter<VoltraActivityUpdateEvent>
  readonly onActivityTokenReceived: CodegenTypes.EventEmitter<VoltraActivityTokenReceivedEvent>
  readonly onActivityPushToStartTokenReceived: CodegenTypes.EventEmitter<VoltraActivityPushToStartTokenReceivedEvent>
  readonly onActivityEnablementChanged: CodegenTypes.EventEmitter<VoltraActivityEnablementChangedEvent>
  drainDynamicLiveActivityRenderFailures(): void
  setDynamicLiveActivityRenderFailureListenerActive(active: boolean): void
  /** Internal: remove and return queued taps, oldest first; with `sources`, only taps from those sources. */
  popInteractions(sources?: string[] | null): QueuedVoltraInteraction[]
  getLiveActivityPushTokens(): Promise<LiveActivityPushToken[]>
  getLiveActivityPushToStartToken(): Promise<string | null>
  areLiveActivitiesEnabled(): boolean
  startLiveActivity(jsonString: string, options: StartVoltraOptions): Promise<string>
  updateLiveActivity(activityId: string, jsonString: string, options: UpdateVoltraOptions): Promise<void>
  startDynamicLiveActivity(definitionId: string, propsJson: string, options: StartVoltraOptions): Promise<string>
  updateDynamicLiveActivity(activityId: string, propsJson: string, options: UpdateVoltraOptions): Promise<void>
  endLiveActivity(activityId: string, options: EndVoltraOptions): Promise<void>
  endAllLiveActivities(): Promise<void>
  getLatestVoltraActivityId(): Promise<string | null>
  listVoltraActivityIds(): Promise<string[]>
  getDynamicLiveActivityDefinitionIds(): Promise<string[]>
  isLiveActivityActive(activityName: string): boolean
  isHeadless(): boolean
  preloadImages(images: PreloadImageOptions[]): Promise<PreloadImagesResult>
  reloadLiveActivities(activityNames?: string[] | null): Promise<void>
  reloadDynamicLiveActivities(definitionIds?: string[] | null): Promise<void>
  clearPreloadedImages(keys?: string[] | null): Promise<void>
  updateDynamicWidget(dynamicWidgetId: string, dynamicWidgetPropsJson: string): Promise<void>
  /** Language override for Dynamic Widgets and Live Activities (`env.appLocale`); null clears it. */
  setDynamicWidgetLocale(tag: string | null): Promise<void>
  updateWidget(widgetId: string, jsonString: string, options: UpdateWidgetOptions): Promise<void>
  scheduleWidget(widgetId: string, timelineJson: string): Promise<void>
  reloadWidgets(widgetIds?: string[] | null): Promise<void>
  clearWidget(widgetId: string): Promise<void>
  clearAllWidgets(): Promise<void>
  getActiveWidgets<T = unknown>(): Promise<T[]>
  /** Settings are passed as JSON so an arbitrary `body` survives the bridge unchanged. */
  setWidgetServerUpdate(settingsJson: string, widgetId?: string | null): Promise<void>
  clearWidgetServerUpdate(widgetId?: string | null): Promise<void>
  /** Result is JSON so an arbitrary `body` survives the bridge unchanged, or null. */
  getWidgetServerUpdate(widgetId?: string | null): Promise<string | null>
  setWidgetServerCredentials(credentials: WidgetServerCredentials): Promise<void>
  clearWidgetServerCredentials(): Promise<void>
}

export function getNativeVoltra(): Spec {
  const voltraModule = TurboModuleRegistry.get<Spec>('NativeVoltra')

  if (voltraModule == null) {
    throw new Error('NativeVoltra is not available')
  }

  return voltraModule
}
