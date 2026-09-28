import type { ReactNode } from 'react'

import type { ImageSource } from '../jsx/Image.js'

export type AndroidOngoingNotificationFallbackBehavior = 'standard' | 'error'

export type AndroidOngoingNotificationChronometer = boolean | 'countUp' | 'countDown'

export type AndroidOngoingNotificationCommonDisplayProps = {
  title?: string
  subText?: string
  shortCriticalText?: string
  when?: Date | number
  chronometer?: AndroidOngoingNotificationChronometer
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
  chronometerCountDown?: boolean
  largeIcon?: ImageSource
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
  largeIcon?: ImageSource
  metrics: AndroidOngoingNotificationMetricEntryPayload[]
  criticalMetric?: number
  semanticStyle?: AndroidOngoingNotificationMetricSemanticStyle
  actions?: AndroidOngoingNotificationActionPayload[]
}

export type AndroidOngoingNotificationPayload =
  | AndroidOngoingNotificationProgressPayload
  | AndroidOngoingNotificationBigTextPayload
  | AndroidOngoingNotificationMetricPayload

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
}

export type UpdateAndroidOngoingNotificationOptions = Omit<
  Partial<StartAndroidOngoingNotificationOptions>,
  'notificationId'
>

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
      promotion?: AndroidOngoingNotificationPromotionInfo
      styleFallback?: AndroidOngoingNotificationStyleFallback
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
      promotion?: AndroidOngoingNotificationPromotionInfo
      styleFallback?: AndroidOngoingNotificationStyleFallback
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
