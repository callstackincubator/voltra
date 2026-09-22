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
export type AndroidOngoingNotificationCommonDisplayProps = {
  title?: string
  subText?: string
  shortCriticalText?: string
  when?: Date | number
  chronometer?: boolean
  /** Show the timestamp. Defaults to true when `when` or `chronometer` is set, false otherwise. */
  showWhen?: boolean
  /** Count the chronometer down instead of up. Requires `chronometer`. */
  chronometerCountDown?: boolean
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

export type AndroidOngoingNotificationPayload =
  | AndroidOngoingNotificationProgressPayload
  | AndroidOngoingNotificationBigTextPayload

export type AndroidOngoingNotificationContent = ReactNode

export type AndroidOngoingNotificationInput =
  | AndroidOngoingNotificationContent
  | AndroidOngoingNotificationPayload
  | string

export type StartAndroidOngoingNotificationOptions = {
  notificationId?: string
  channelId: string
  smallIcon?: string
  deepLinkUrl?: string
  requestPromotedOngoing?: boolean
  fallbackBehavior?: AndroidOngoingNotificationFallbackBehavior
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
  'notificationId' | keyof AndroidOngoingNotificationPresentationOptions
> &
  Clearable<AndroidOngoingNotificationPresentationOptions> & {
    /**
     * Let this update make a sound, vibrate or show lights the way a first post does, instead of
     * updating silently. Applies to this post only and is never stored, so the next update is quiet
     * again unless it asks.
     */
    alert?: boolean
  }

export type UseAndroidOngoingNotificationOptions = StartAndroidOngoingNotificationOptions & {
  autoStart?: boolean
  autoUpdate?: boolean
}

export type AndroidOngoingNotificationCapabilities = {
  apiLevel: number
  notificationsEnabled: boolean
  supportsPromotedNotifications: boolean
  canPostPromotedNotifications: boolean
  canRequestPromotedOngoing: boolean
}

export type AndroidOngoingNotificationStatus = {
  isActive: boolean
  isDismissed: boolean
  isPromoted?: boolean
  hasPromotableCharacteristics?: boolean
}

export type AndroidOngoingNotificationStartResult =
  | {
      ok: true
      notificationId: string
      action: 'started'
      reason?: undefined
    }
  | {
      ok: false
      notificationId: string
      action?: undefined
      reason: 'already_exists'
    }

export type AndroidOngoingNotificationUpdateResult =
  | {
      ok: true
      notificationId: string
      action: 'updated'
      reason?: undefined
    }
  | {
      ok: false
      notificationId: string
      action?: undefined
      reason: 'not_found' | 'dismissed'
    }

export type AndroidOngoingNotificationUpsertResult =
  | {
      ok: true
      notificationId: string
      action: 'started' | 'updated'
      reason?: undefined
    }
  | {
      ok: false
      notificationId: string
      action?: undefined
      reason: 'already_exists' | 'dismissed'
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
      reason: 'not_found'
    }

export type UseAndroidOngoingNotificationResult = {
  start: (options?: Partial<StartAndroidOngoingNotificationOptions>) => Promise<AndroidOngoingNotificationStartResult>
  update: (options?: UpdateAndroidOngoingNotificationOptions) => Promise<AndroidOngoingNotificationUpdateResult>
  end: () => Promise<AndroidOngoingNotificationStopResult>
  isActive: boolean
}
