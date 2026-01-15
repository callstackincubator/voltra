import type { ReactNode } from 'react'

import type { VoltraNodeJson } from '../../types.js'

/**
 * Android Live Update variants for Ongoing Notifications.
 *
 * Android ongoing notifications have a simpler structure than iOS Live Activities.
 * There's no Dynamic Island equivalent.
 */
export type AndroidLiveUpdateVariants = {
  /**
   * The collapsed notification content (always visible in the notification shade).
   * Height constraint: ~64dp
   */
  collapsed?: ReactNode

  /**
   * The expanded notification content (visible when user expands the notification).
   * Height constraint: up to 256dp
   */
  expanded?: ReactNode

  /**
   * Small icon resource name for the notification.
   * Should reference a drawable resource (e.g., 'ic_notification')
   */
  smallIcon?: string

  /**
   * Notification channel ID (required on Android 8+).
   * The channel must be created before starting the live update.
   */
  channelId?: string
}

/**
 * Rendered Android Live Update variants to JSON.
 */
export type AndroidLiveUpdateVariantsJson = {
  /** Payload version - required for remote updates */
  v: number
  /** Shared stylesheet for all variants */
  s?: Record<string, unknown>[]
  /** Shared elements for deduplication */
  e?: VoltraNodeJson[]
  /** Collapsed notification content */
  collapsed?: VoltraNodeJson
  /** Expanded notification content */
  expanded?: VoltraNodeJson
  /** Small icon resource name */
  smallIcon?: string
  /** Notification channel ID */
  channelId?: string
}

/**
 * JSON representation of Android live update variants for rendering
 */
export type AndroidLiveUpdateJson = AndroidLiveUpdateVariantsJson

/**
 * Options for starting an Android Live Update
 */
export type StartAndroidLiveUpdateOptions = {
  /**
   * A unique name for this live update.
   * Allows you to rebind to the same notification on app restart.
   */
  updateName?: string

  /**
   * The notification channel ID to use.
   * Overrides the channelId from variants if provided.
   */
  channelId?: string
}

/**
 * Options for updating an Android Live Update
 */
export type UpdateAndroidLiveUpdateOptions = {
  // Currently no additional options, but keeping for future extensibility
}

/**
 * Options for the useAndroidLiveUpdate hook
 */
export type UseAndroidLiveUpdateOptions = {
  /**
   * A unique name for this live update.
   * Allows you to rebind to the same notification on app restart.
   */
  updateName?: string

  /**
   * Automatically start the live update when the component mounts.
   */
  autoStart?: boolean

  /**
   * Automatically update the live update when the component updates.
   */
  autoUpdate?: boolean
}

/**
 * Result from the useAndroidLiveUpdate hook
 */
export type UseAndroidLiveUpdateResult = {
  start: (options?: StartAndroidLiveUpdateOptions) => Promise<void>
  update: (options?: UpdateAndroidLiveUpdateOptions) => Promise<void>
  end: () => Promise<void>
  isActive: boolean
}
