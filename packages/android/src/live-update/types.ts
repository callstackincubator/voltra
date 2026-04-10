import type { ReactNode } from 'react'

import type { ImageSource } from '../jsx/Image.js'

export type AndroidOngoingNotificationFallbackBehavior = 'standard' | 'error'

export type AndroidOngoingNotificationCommonDisplayProps = {
  title?: string
  subText?: string
  shortCriticalText?: string
  when?: Date | number
  chronometer?: boolean
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
  largeIcon?: ImageSource
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
  largeIcon?: ImageSource
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

/**
 * Options for starting an Android ongoing notification.
 */
export type StartAndroidOngoingNotificationOptions = {
  /**
   * A unique identifier for this ongoing notification.
   * Allows you to rebind to the same notification on app restart.
   */
  notificationId?: string

  /**
   * The notification channel ID to use.
   * The channel must already exist.
   */
  channelId: string

  /**
   * Small icon resource name for the notification.
   * Overrides the smallIcon from variants if provided.
   */
  smallIcon?: string

  /**
   * Deep link URL to open when the notification is tapped.
   */
  deepLinkUrl?: string

  /**
   * Whether to request promoted ongoing presentation when supported.
   */
  requestPromotedOngoing?: boolean

  /**
   * Behavior when promotion is requested but unavailable.
   */
  fallbackBehavior?: AndroidOngoingNotificationFallbackBehavior
}

/**
 * Options for updating an Android ongoing notification.
 */
export type UpdateAndroidOngoingNotificationOptions = Omit<
  Partial<StartAndroidOngoingNotificationOptions>,
  'notificationId'
>

/**
 * Options for the useAndroidOngoingNotification hook.
 */
export type UseAndroidOngoingNotificationOptions = StartAndroidOngoingNotificationOptions & {
  /**
   * Automatically start the ongoing notification when the component mounts.
   */
  autoStart?: boolean

  /**
   * Automatically update the ongoing notification when the component updates.
   */
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

/**
 * Result from the useAndroidOngoingNotification hook.
 */
export type UseAndroidOngoingNotificationResult = {
  start: (options?: Partial<StartAndroidOngoingNotificationOptions>) => Promise<AndroidOngoingNotificationStartResult>
  update: (options?: UpdateAndroidOngoingNotificationOptions) => Promise<AndroidOngoingNotificationUpdateResult>
  end: () => Promise<AndroidOngoingNotificationStopResult>
  isActive: boolean
}
