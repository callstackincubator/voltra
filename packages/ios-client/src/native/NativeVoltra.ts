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
  readonly onInteraction: CodegenTypes.EventEmitter<VoltraInteractionEvent>
  readonly onStateChanged: CodegenTypes.EventEmitter<VoltraActivityUpdateEvent>
  readonly onActivityTokenReceived: CodegenTypes.EventEmitter<VoltraActivityTokenReceivedEvent>
  readonly onActivityPushToStartTokenReceived: CodegenTypes.EventEmitter<VoltraActivityPushToStartTokenReceivedEvent>
  startLiveActivity(jsonString: string, options: StartVoltraOptions): Promise<string>
  updateLiveActivity(activityId: string, jsonString: string, options: UpdateVoltraOptions): Promise<void>
  endLiveActivity(activityId: string, options: EndVoltraOptions): Promise<void>
  endAllLiveActivities(): Promise<void>
  getLatestVoltraActivityId(): Promise<string | null>
  listVoltraActivityIds(): Promise<string[]>
  isLiveActivityActive(activityName: string): boolean
  isHeadless(): boolean
  preloadImages(images: PreloadImageOptions[]): Promise<PreloadImagesResult>
  reloadLiveActivities(activityNames?: string[] | null): Promise<void>
  clearPreloadedImages(keys?: string[] | null): Promise<void>
  updateWidget(widgetId: string, jsonString: string, options: UpdateWidgetOptions): Promise<void>
  scheduleWidget(widgetId: string, timelineJson: string): Promise<void>
  reloadWidgets(widgetIds?: string[] | null): Promise<void>
  clearWidget(widgetId: string): Promise<void>
  clearAllWidgets(): Promise<void>
  getActiveWidgets<T = unknown>(): Promise<T[]>
  setWidgetServerCredentials(credentials: WidgetServerCredentials): Promise<void>
  clearWidgetServerCredentials(): Promise<void>
  /**
   * Track 5 / Phase 3a — runtime smoke test surface.
   *
   * Evaluate a Metro-built widget bundle in the shared JSContext, capturing the bundle's
   * `render(props, env)` export under `globalThis.__voltraWidgets[<widgetId>]`. Bundle
   * source is the raw string returned by Metro's `/voltra/widgets/<id>.bundle` endpoint.
   *
   * Temporary debug surface; replaced by widget-extension wiring in Phase 3b.
   */
  voltraWidgetEvalBundle(widgetId: string, bundleSource: string): Promise<void>
  /**
   * Track 5 / Phase 3a — invoke a previously-evaluated widget's `render(props, env)`
   * function. Returns the resolved JSON string the bundle produced.
   *
   * Temporary debug surface; replaced by widget-extension wiring in Phase 3b.
   */
  voltraWidgetRender(widgetId: string, propsJSON: string, envJSON: string): Promise<string>
}

export function getNativeVoltra(): Spec {
  const voltraModule = TurboModuleRegistry.get<Spec>('NativeVoltra')

  if (voltraModule == null) {
    throw new Error('NativeVoltra is not available')
  }

  return voltraModule
}
