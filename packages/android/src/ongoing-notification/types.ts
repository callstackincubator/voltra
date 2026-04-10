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
