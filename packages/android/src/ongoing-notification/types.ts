import type { ReactNode } from 'react'

import type { ImageSource } from '../jsx/Image.js'

export type AndroidOngoingNotificationFallbackBehavior = 'standard' | 'error'

/** Lock-screen and heads-up visibility, mapped onto `Notification.VISIBILITY_*` on Android. */
export const ANDROID_ONGOING_NOTIFICATION_VISIBILITIES = ['public', 'private', 'secret'] as const
export type AndroidOngoingNotificationVisibility = (typeof ANDROID_ONGOING_NOTIFICATION_VISIBILITIES)[number]

/**
 * Notification categories Voltra exposes.
 *
 * Categories that carry do-not-disturb or ranking meaning for other notification kinds (`call`,
 * `alarm`, `message`, and the rest) are deliberately absent: Voltra does not post those kinds, and
 * picking one would change how an ongoing notification is treated beside unrelated notifications.
 */
export const ANDROID_ONGOING_NOTIFICATION_CATEGORIES = [
  'progress',
  'navigation',
  'transport',
  'service',
  'status',
  'workout',
  'stopwatch',
  'location_sharing',
] as const
export type AndroidOngoingNotificationCategory = (typeof ANDROID_ONGOING_NOTIFICATION_CATEGORIES)[number]

/**
 * How the system should treat an ongoing notification for its whole lifetime.
 *
 * These belong in the options rather than the payload because they are a decision the app makes
 * once and keeps: an update that does not mention them must not change them, and a server that only
 * renders what the notification says has no business deciding them. Set them where you set
 * `channelId`.
 */
export type AndroidOngoingNotificationPresentationOptions = {
  /** Lock-screen visibility. Unset keeps the system default, which is `'private'`. */
  visibility?: AndroidOngoingNotificationVisibility
  /** Accent color for the notification, as any static color string: `#1E88E5`, `rgb(30, 136, 229)`, or a name. */
  color?: string
  /** Overrides the category Voltra derives from the payload kind. */
  category?: AndroidOngoingNotificationCategory
  /**
   * Remove the notification after this many milliseconds without an update. Applied on every post,
   * so each update restarts the timer. Needs Android 8.0 or newer; the value is kept on older
   * releases and applied once the device updates.
   */
  timeoutMs?: number
  /** Keep the notification on this device instead of mirroring it to Wear or Android Auto. */
  localOnly?: boolean
  /** Group key, for the system bundle that collects this notification with siblings. */
  group?: string
  /** Orders this notification inside its group. */
  sortKey?: string
  /** Let the system add its own contextual actions, such as a directions chip. Defaults to the platform default, `true`. */
  allowSystemGeneratedContextualActions?: boolean
}

/** The lock-screen copy of a notification whose private content should stay hidden there. */
export type AndroidOngoingNotificationPublicVersion = {
  title: string
  text?: string
}

/**
 * Display props shared by both payload kinds.
 *
 * These travel in the payload rather than the options because they say what the notification means
 * right now: like `title` and `text`, an update replaces them wholesale, so omitting `publicVersion`
 * posts without one.
 */
export type AndroidOngoingNotificationChronometer = boolean | 'countUp' | 'countDown'

export type AndroidOngoingNotificationCommonDisplayProps = {
  title?: string
  subText?: string
  shortCriticalText?: string
  when?: Date | number
  chronometer?: AndroidOngoingNotificationChronometer
  /** Show the timestamp. Defaults to true when `when` or `chronometer` is set, false otherwise. */
  showWhen?: boolean
  publicVersion?: AndroidOngoingNotificationPublicVersion
}

export type AndroidOngoingNotificationProgressSegment = {
  length: number
  color?: string
}

export type AndroidOngoingNotificationProgressPoint = {
  position: number
  color?: string
}

export type AndroidOngoingNotificationActionProps = {
  title: string
  deepLinkUrl: string
  icon?: ImageSource
}

export type AndroidOngoingNotificationActionPayload = {
  title: string
  deepLinkUrl: string
  icon?: ImageSource
}

export type AndroidOngoingNotificationProgressProps = AndroidOngoingNotificationCommonDisplayProps & {
  text?: string
  value: number
  max: number
  indeterminate?: boolean
  largeIcon?: ImageSource
  progressTrackerIcon?: ImageSource
  progressStartIcon?: ImageSource
  progressEndIcon?: ImageSource
  segments?: AndroidOngoingNotificationProgressSegment[]
  points?: AndroidOngoingNotificationProgressPoint[]
  children?: ReactNode
}

export type AndroidOngoingNotificationBigTextProps = AndroidOngoingNotificationCommonDisplayProps & {
  text: string
  bigText?: string
  largeIcon?: ImageSource
  children?: ReactNode
}

export type AndroidOngoingNotificationBigPictureProps = AndroidOngoingNotificationCommonDisplayProps & {
  picture: ImageSource
  text?: string
  summaryText?: string
  pictureContentDescription?: string
  showPictureWhenCollapsed?: boolean
  largeIcon?: ImageSource
  bigLargeIcon?: ImageSource
  hideLargeIconWhenExpanded?: boolean
  children?: ReactNode
}

export type AndroidOngoingNotificationInboxProps = AndroidOngoingNotificationCommonDisplayProps & {
  lines: string[]
  text?: string
  summaryText?: string
  largeIcon?: ImageSource
  children?: ReactNode
}

export type AndroidOngoingNotificationMetricSemanticStyle = 'unspecified' | 'info' | 'safe' | 'caution' | 'danger'

export type AndroidOngoingNotificationMetricTimeFormat = 'adaptive' | 'chronometer'

/**
 * A metric reading. Plain numbers and strings are shorthands: an integer becomes
 * `int`, any other number becomes `float`, and a string becomes `text`.
 */
export type AndroidOngoingNotificationMetricValue =
  | { type: 'int'; value: number; unit?: string }
  | {
      type: 'float'
      value: number
      unit?: string
      min?: number
      max?: number
      fractionDigits?: number
    }
  | { type: 'text'; value: string; unit?: string }
  | { type: 'time'; value: string }
  | { type: 'timer'; endsAt: number | Date; format?: AndroidOngoingNotificationMetricTimeFormat }
  | { type: 'stopwatch'; startedAt: number | Date; format?: AndroidOngoingNotificationMetricTimeFormat }
  | { type: 'pausedTimer'; remainingMillis: number }
  | { type: 'pausedStopwatch'; elapsedMillis: number }
  | number
  | string

export type AndroidOngoingNotificationMetricDescriptor = {
  label: string
  value: AndroidOngoingNotificationMetricValue
  /** Shorthand for the unit of a number value; moved into the value object when rendering. */
  unit?: string
}

export type AndroidOngoingNotificationMetricProps = AndroidOngoingNotificationCommonDisplayProps & {
  metrics: AndroidOngoingNotificationMetricDescriptor[]
  criticalMetric?: number
  semanticStyle?: AndroidOngoingNotificationMetricSemanticStyle
  largeIcon?: ImageSource
  children?: ReactNode
}

export type AndroidOngoingNotificationProgressPayload = {
  v: 1
  kind: 'progress'
  title?: string
  subText?: string
  text?: string
  value: number
  max: number
  indeterminate?: boolean
  shortCriticalText?: string
  when?: number
  chronometer?: boolean
  chronometerCountDown?: boolean
  showWhen?: boolean
  largeIcon?: ImageSource
  publicVersion?: AndroidOngoingNotificationPublicVersion
  progressTrackerIcon?: ImageSource
  progressStartIcon?: ImageSource
  progressEndIcon?: ImageSource
  segments?: AndroidOngoingNotificationProgressSegment[]
  points?: AndroidOngoingNotificationProgressPoint[]
  actions?: AndroidOngoingNotificationActionPayload[]
}

export type AndroidOngoingNotificationBigTextPayload = {
  v: 1
  kind: 'bigText'
  title?: string
  subText?: string
  text: string
  bigText?: string
  shortCriticalText?: string
  when?: number
  chronometer?: boolean
  chronometerCountDown?: boolean
  showWhen?: boolean
  largeIcon?: ImageSource
  publicVersion?: AndroidOngoingNotificationPublicVersion
  actions?: AndroidOngoingNotificationActionPayload[]
}

export type AndroidOngoingNotificationBigPicturePayload = {
  v: 1
  kind: 'bigPicture'
  title?: string
  subText?: string
  text?: string
  picture: ImageSource
  summaryText?: string
  pictureContentDescription?: string
  showPictureWhenCollapsed?: boolean
  largeIcon?: ImageSource
  bigLargeIcon?: ImageSource
  hideLargeIconWhenExpanded?: boolean
  shortCriticalText?: string
  when?: number
  chronometer?: boolean
  chronometerCountDown?: boolean
  showWhen?: boolean
  publicVersion?: AndroidOngoingNotificationPublicVersion
  actions?: AndroidOngoingNotificationActionPayload[]
}

export type AndroidOngoingNotificationInboxPayload = {
  v: 1
  kind: 'inbox'
  title?: string
  subText?: string
  text: string
  lines: string[]
  summaryText?: string
  shortCriticalText?: string
  when?: number
  chronometer?: boolean
  chronometerCountDown?: boolean
  showWhen?: boolean
  largeIcon?: ImageSource
  publicVersion?: AndroidOngoingNotificationPublicVersion
  actions?: AndroidOngoingNotificationActionPayload[]
}

export type AndroidOngoingNotificationMetricValuePayload =
  | { type: 'int'; value: number; unit?: string }
  | {
      type: 'float'
      value: number
      unit?: string
      min?: number
      max?: number
      fractionDigits?: number
    }
  | { type: 'text'; value: string; unit?: string }
  | { type: 'time'; value: string }
  | { type: 'timer'; endsAt: number; format?: AndroidOngoingNotificationMetricTimeFormat }
  | { type: 'stopwatch'; startedAt: number; format?: AndroidOngoingNotificationMetricTimeFormat }
  | { type: 'pausedTimer'; remainingMillis: number }
  | { type: 'pausedStopwatch'; elapsedMillis: number }

export type AndroidOngoingNotificationMetricEntryPayload = {
  label: string
  value: AndroidOngoingNotificationMetricValuePayload
}

export type AndroidOngoingNotificationMetricPayload = {
  v: 1
  kind: 'metric'
  title?: string
  subText?: string
  shortCriticalText?: string
  when?: number
  chronometer?: boolean
  chronometerCountDown?: boolean
  showWhen?: boolean
  largeIcon?: ImageSource
  publicVersion?: AndroidOngoingNotificationPublicVersion
  metrics: AndroidOngoingNotificationMetricEntryPayload[]
  criticalMetric?: number
  semanticStyle?: AndroidOngoingNotificationMetricSemanticStyle
  actions?: AndroidOngoingNotificationActionPayload[]
}

export type AndroidOngoingNotificationPayload =
  | AndroidOngoingNotificationProgressPayload
  | AndroidOngoingNotificationBigTextPayload
  | AndroidOngoingNotificationBigPicturePayload
  | AndroidOngoingNotificationInboxPayload
  | AndroidOngoingNotificationMetricPayload

export type AndroidOngoingNotificationContent = ReactNode

export type AndroidOngoingNotificationInput =
  | AndroidOngoingNotificationContent
  | AndroidOngoingNotificationPayload
  | string

/**
 * Types Voltra's foreground service can run as. Each one must be listed in the config plugin's
 * `ongoingNotificationForegroundService.types` and declared in Play Console.
 */
export const ANDROID_ONGOING_NOTIFICATION_FOREGROUND_SERVICE_TYPES = [
  'location',
  'health',
  'mediaPlayback',
  'remoteMessaging',
  'connectedDevice',
  'dataSync',
  'shortService',
  'specialUse',
] as const

export type AndroidOngoingNotificationForegroundServiceType =
  (typeof ANDROID_ONGOING_NOTIFICATION_FOREGROUND_SERVICE_TYPES)[number]

export type AndroidOngoingNotificationForegroundServiceOptions = {
  type: AndroidOngoingNotificationForegroundServiceType
  /** What Voltra does with the service when the user swipes the notification away (API 34+). Default 'stop'. */
  onDismiss?: 'stop' | 'keep'
  /** 'standard' (default): keep the notification posted if the service cannot attach. 'error': remove it and reject. */
  fallbackBehavior?: AndroidOngoingNotificationFallbackBehavior
}

export type StartAndroidOngoingNotificationOptions = {
  notificationId?: string
  channelId: string
  smallIcon?: string
  deepLinkUrl?: string
  requestPromotedOngoing?: boolean
  fallbackBehavior?: AndroidOngoingNotificationFallbackBehavior
  /** Back the notification with Voltra's foreground service so the app process stays alive. Start and upsert only. */
  foregroundService?: AndroidOngoingNotificationForegroundServiceOptions
  /**
   * A non-negative integer that grows with every change you send. A call whose revision is not above
   * the last one applied to this notification is dropped with `reason: 'stale_revision'`, so pushes
   * that arrive out of order cannot show older content.
   */
  revision?: number
} & AndroidOngoingNotificationPresentationOptions

/** An update can send `null` for a presentation option to clear the value stored at start. */
type Clearable<T> = { [K in keyof T]?: T[K] | null }

/**
 * Options for one update.
 *
 * Presentation options are three-state: leave a key out to keep what the running notification
 * already uses, send `null` to clear it, or send a value to replace and store it. Every other key
 * keeps the existing merge behaviour, where an omitted key reuses the stored value.
 */
export type UpdateAndroidOngoingNotificationOptions = Omit<
  Partial<StartAndroidOngoingNotificationOptions>,
  'notificationId' | 'foregroundService' | keyof AndroidOngoingNotificationPresentationOptions
> &
  Clearable<AndroidOngoingNotificationPresentationOptions> & {
    /**
     * Let this update make a sound, vibrate or show lights the way a first post does, instead of
     * updating silently. Applies to this post only and is never stored, so the next update is quiet
     * again unless it asks.
     */
    alert?: boolean
  }

/**
 * Options for starting or updating with one call.
 *
 * The shape of start plus what only an update can use: a presentation option sent as `null` clears
 * the stored value when the notification already exists, and `alert` lets that update branch alert.
 * On the start branch neither changes anything, because nothing is stored yet and a first post
 * always alerts.
 */
export type UpsertAndroidOngoingNotificationOptions = Omit<
  StartAndroidOngoingNotificationOptions,
  keyof AndroidOngoingNotificationPresentationOptions
> &
  Clearable<AndroidOngoingNotificationPresentationOptions> & {
    /** Let the update branch make a sound the way a first post does. A start branch always alerts. */
    alert?: boolean
  }

/**
 * `revision` is left out: the hook replays its options on every update, so a stored revision would
 * make every update after the first one stale. Pass it to a single `start()` or `update()` instead.
 */
export type UseAndroidOngoingNotificationOptions = Omit<StartAndroidOngoingNotificationOptions, 'revision'> & {
  autoStart?: boolean
  autoUpdate?: boolean
}

export type StopAndroidOngoingNotificationOptions = {
  /** Dropped as stale unless above the last revision applied to this notification. */
  revision?: number
}

export type AndroidOngoingNotificationCapabilities = {
  apiLevel: number
  notificationsEnabled: boolean
  supportsPromotedNotifications: boolean
  canPostPromotedNotifications: boolean
  canRequestPromotedOngoing: boolean
  /** True on Android 14 and later, where the user can swipe any ongoing notification away. */
  isUserDismissible: boolean
  /** True when the config plugin declared Voltra's foreground service. */
  supportsForegroundService: boolean
  /** Types declared on the service. Empty when it is not declared, and below Android 10. */
  foregroundServiceTypes: AndroidOngoingNotificationForegroundServiceType[]
}

export type AndroidOngoingNotificationForegroundServiceState = 'attached' | 'detached' | 'timed_out' | 'failed'

export type AndroidOngoingNotificationStatus = {
  isActive: boolean
  isDismissed: boolean
  isPromoted?: boolean
  hasPromotableCharacteristics?: boolean
  /** Set when the notification was started with `foregroundService`. */
  foregroundService?: {
    type: AndroidOngoingNotificationForegroundServiceType
    state: AndroidOngoingNotificationForegroundServiceState
  }
}

export type AndroidOngoingNotificationHandle = {
  notificationId: string
  /** The id the notification is posted under; pass it to your own service's `startForeground`. */
  systemNotificationId: number
}

export type AndroidOngoingNotificationForegroundServiceAttachFailure =
  | 'not_declared'
  | 'type_not_declared'
  | 'unsupported_api'
  | 'background_start_not_allowed'
  | 'missing_permission'
  | 'timeout_exhausted'
  | 'busy'
  | 'attach_timeout'

export type AndroidOngoingNotificationForegroundServiceResult =
  | { attached: true; type: AndroidOngoingNotificationForegroundServiceType; reason?: undefined }
  | { attached: false; type?: undefined; reason: AndroidOngoingNotificationForegroundServiceAttachFailure }

export type AndroidOngoingNotificationPromotionIssue =
  | 'unsupported_api_level'
  | 'permission_not_declared'
  | 'notifications_disabled'
  | 'promotion_disabled_by_user'
  | 'channel_importance_min'
  | 'missing_title'
  | 'not_promotable'

export type AndroidOngoingNotificationPromotionInfo = {
  requested: boolean
  eligible: boolean
  reasons: AndroidOngoingNotificationPromotionIssue[]
  hasPromotableCharacteristics?: boolean
}

export type CheckAndroidOngoingNotificationPromotionOptions = Pick<
  StartAndroidOngoingNotificationOptions,
  'channelId' | 'smallIcon'
>

export type AndroidOngoingNotificationCheckPromotionResult = {
  eligible: boolean
  reasons: AndroidOngoingNotificationPromotionIssue[]
  hasPromotableCharacteristics?: boolean
}

/** Set when a style the device cannot show yet was posted as a standard notification. */
export type AndroidOngoingNotificationStyleFallback = 'standard'

export type AndroidOngoingNotificationStartResult =
  | {
      ok: true
      notificationId: string
      action: 'started'
      reason?: undefined
      promotion?: AndroidOngoingNotificationPromotionInfo
      styleFallback?: AndroidOngoingNotificationStyleFallback
      foregroundService?: AndroidOngoingNotificationForegroundServiceResult
    }
  | {
      ok: false
      notificationId: string
      action?: undefined
      reason: 'already_exists' | 'stale_revision'
    }

export type AndroidOngoingNotificationUpdateResult =
  | {
      ok: true
      notificationId: string
      action: 'updated'
      reason?: undefined
      promotion?: AndroidOngoingNotificationPromotionInfo
      styleFallback?: AndroidOngoingNotificationStyleFallback
    }
  | {
      ok: false
      notificationId: string
      action?: undefined
      reason: 'not_found' | 'dismissed' | 'stale_revision'
    }

export type AndroidOngoingNotificationUpsertResult =
  | {
      ok: true
      notificationId: string
      action: 'started' | 'updated'
      reason?: undefined
      promotion?: AndroidOngoingNotificationPromotionInfo
      styleFallback?: AndroidOngoingNotificationStyleFallback
      foregroundService?: AndroidOngoingNotificationForegroundServiceResult
    }
  | {
      ok: false
      notificationId: string
      action?: undefined
      reason: 'already_exists' | 'dismissed' | 'stale_revision'
    }

export type AndroidOngoingNotificationStopResult =
  | {
      ok: true
      notificationId: string
      action: 'stopped'
      reason?: undefined
    }
  | {
      ok: false
      notificationId: string
      action?: undefined
      reason: 'not_found' | 'stale_revision'
    }

export type UseAndroidOngoingNotificationResult = {
  start: (options?: Partial<StartAndroidOngoingNotificationOptions>) => Promise<AndroidOngoingNotificationStartResult>
  update: (options?: UpdateAndroidOngoingNotificationOptions) => Promise<AndroidOngoingNotificationUpdateResult>
  end: () => Promise<AndroidOngoingNotificationStopResult>
  isActive: boolean
}
