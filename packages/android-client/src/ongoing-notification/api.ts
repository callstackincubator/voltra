import { useCallback, useEffect, useRef, useState } from 'react'
import { PermissionsAndroid, Platform } from 'react-native'

import {
  renderAndroidOngoingNotificationPayload,
  type AndroidOngoingNotificationCapabilities,
  type AndroidOngoingNotificationCheckPromotionResult,
  type AndroidOngoingNotificationContent,
  type AndroidOngoingNotificationInput,
  type AndroidOngoingNotificationPayload,
  type AndroidOngoingNotificationStartResult,
  type AndroidOngoingNotificationStatus,
  type AndroidOngoingNotificationStopResult,
  type AndroidOngoingNotificationUpdateResult,
  type AndroidOngoingNotificationUpsertResult,
  type CheckAndroidOngoingNotificationPromotionOptions,
  type StartAndroidOngoingNotificationOptions,
  type UpdateAndroidOngoingNotificationOptions,
  type UpsertAndroidOngoingNotificationOptions,
  type UseAndroidOngoingNotificationOptions,
  type UseAndroidOngoingNotificationResult,
} from '@use-voltra/android'

import { useUpdateOnHMR } from '../utils/index.js'
import { getNativeVoltraAndroid } from '../native/NativeVoltraAndroid.js'
import {
  getFilteredAndroidOngoingNotificationUpdateOptions,
  getStartAndroidOngoingNotificationOptions,
  getUpsertAndroidOngoingNotificationOptions,
} from './options.js'

const NOTIFICATION_PERMISSION = PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS

const isAndroidNotificationPermissionRequired = (): boolean => {
  return Platform.OS === 'android' && Number(Platform.Version) >= 33
}

const isAndroidOngoingNotificationPayload = (value: unknown): value is AndroidOngoingNotificationPayload => {
  return typeof value === 'object' && value !== null && 'v' in value && 'kind' in value
}

const serializeAndroidOngoingNotificationInput = (input: AndroidOngoingNotificationInput): string => {
  if (typeof input === 'string') {
    return input
  }

  if (isAndroidOngoingNotificationPayload(input)) {
    return JSON.stringify(input)
  }

  return renderAndroidOngoingNotificationPayload(input)
}

const createNotFoundUpdateResult = (notificationId: string): AndroidOngoingNotificationUpdateResult => ({
  ok: false,
  notificationId,
  reason: 'not_found',
})

const createNotFoundStopResult = (notificationId: string): AndroidOngoingNotificationStopResult => ({
  ok: false,
  notificationId,
  reason: 'not_found',
})

export const useAndroidOngoingNotification = (
  content: AndroidOngoingNotificationContent,
  options: UseAndroidOngoingNotificationOptions
): UseAndroidOngoingNotificationResult => {
  const [targetId, setTargetId] = useState<string | null>(() => {
    if (options.notificationId) {
      return isAndroidOngoingNotificationActive(options.notificationId) ? options.notificationId : null
    }

    return null
  })

  const isActive = targetId !== null
  const targetIdRef = useRef(targetId)
  const optionsRef = useRef(options)
  const contentRef = useRef(content)
  const lastUpdateOptionsRef = useRef<UpdateAndroidOngoingNotificationOptions | undefined>(undefined)

  useEffect(() => {
    targetIdRef.current = targetId
  }, [targetId])

  useEffect(() => {
    optionsRef.current = options
  }, [options])

  useEffect(() => {
    contentRef.current = content
  }, [content])

  useUpdateOnHMR()

  // The device ends a notification without any call from this hook: the user swipes it away, its
  // timeout expires, or other code stops it. Native code reports each of those, so `isActive` follows
  // the device rather than only this hook's own calls (ADR 0012).
  useEffect(() => {
    if (Platform.OS !== 'android') {
      return
    }

    const clearIfCurrent = (notificationId: string) => {
      setTargetId((current) => (current === notificationId ? null : current))
    }

    // Mounting the hook never required the native module before; without it (or with a native build
    // older than this JS), the hook keeps working from its own calls instead of crashing the screen.
    let subscription: { remove: () => void }
    try {
      const nativeModule = getNativeVoltraAndroid()
      if (typeof nativeModule.onOngoingNotificationEnded !== 'function') {
        return
      }
      subscription = nativeModule.onOngoingNotificationEnded(({ notificationId }) => {
        clearIfCurrent(notificationId)
      })
    } catch {
      return
    }

    // Subscribe first, then read: a dismissal that landed after the first render but before the
    // subscription existed is only visible through the getter.
    const subscribedTargetId = targetIdRef.current
    if (subscribedTargetId && !isAndroidOngoingNotificationActive(subscribedTargetId)) {
      clearIfCurrent(subscribedTargetId)
    }

    return () => subscription.remove()
  }, [])

  const start = useCallback(async (options?: Partial<StartAndroidOngoingNotificationOptions>) => {
    const startOptions = { ...optionsRef.current, ...options }
    if (!startOptions.channelId) {
      throw new Error('[Voltra] [Android] Ongoing notifications require an explicit channelId.')
    }

    const result = await startAndroidOngoingNotification(
      contentRef.current,
      startOptions as StartAndroidOngoingNotificationOptions
    )
    if (result.ok) {
      setTargetId(result.notificationId)
    } else if (result.reason === 'already_exists' && isAndroidOngoingNotificationActive(result.notificationId)) {
      setTargetId(result.notificationId)
    }

    return result
  }, [])

  const update = useCallback(
    async (options?: UpdateAndroidOngoingNotificationOptions) => {
      if (!targetId) {
        return createNotFoundUpdateResult(optionsRef.current?.notificationId ?? 'unknown')
      }

      const updateOptions = { ...optionsRef.current, ...options }
      // `alert` describes exactly the one post it arrived with, so it must never live in the object
      // the autoUpdate effect replays: caching it would alert again on every content change.
      lastUpdateOptionsRef.current = { ...updateOptions, alert: undefined }
      return updateAndroidOngoingNotification(targetId, contentRef.current, updateOptions)
    },
    [targetId]
  )

  const end = useCallback(async () => {
    if (!targetId) {
      return createNotFoundStopResult(optionsRef.current?.notificationId ?? 'unknown')
    }

    const result = await stopAndroidOngoingNotification(targetId)
    if (result.ok || result.reason === 'not_found') {
      setTargetId(null)
    }

    return result
  }, [targetId])

  // Runs when the component mounts with autoStart on, or when autoStart turns on, and not whenever the
  // hook becomes inactive: a notification the user dismissed, or that `end()` stopped, stays ended.
  useEffect(() => {
    if (!options.autoStart || targetIdRef.current) {
      return
    }

    // Auto-start rejections (e.g. VOLTRA_NOTIFICATION_CHANNEL_NOT_FOUND) must not
    // surface as unhandled promise rejections; log the coded error instead.
    start().catch((error: unknown) => {
      console.error('[voltra] useAndroidOngoingNotification autoStart failed:', error)
    })
  }, [options.autoStart, start])

  useEffect(() => {
    if (!options.autoUpdate || !targetId) {
      return
    }

    update(lastUpdateOptionsRef.current).catch((error: unknown) => {
      console.error('[voltra] useAndroidOngoingNotification autoUpdate failed:', error)
    })
  }, [content, options.autoUpdate, targetId, update])

  return {
    start,
    update,
    end,
    isActive,
  }
}

export const startAndroidOngoingNotification = async (
  input: AndroidOngoingNotificationInput,
  options: StartAndroidOngoingNotificationOptions
): Promise<AndroidOngoingNotificationStartResult> => {
  return (await getNativeVoltraAndroid().startAndroidOngoingNotification(
    serializeAndroidOngoingNotificationInput(input),
    getStartAndroidOngoingNotificationOptions(options)
  )) as AndroidOngoingNotificationStartResult
}

export const upsertAndroidOngoingNotification = async (
  input: AndroidOngoingNotificationInput,
  options: UpsertAndroidOngoingNotificationOptions
): Promise<AndroidOngoingNotificationUpsertResult> => {
  return (await getNativeVoltraAndroid().upsertAndroidOngoingNotification(
    serializeAndroidOngoingNotificationInput(input),
    getUpsertAndroidOngoingNotificationOptions(options)
  )) as AndroidOngoingNotificationUpsertResult
}

export const updateAndroidOngoingNotification = async (
  notificationId: string,
  input: AndroidOngoingNotificationInput,
  options?: UpdateAndroidOngoingNotificationOptions
): Promise<AndroidOngoingNotificationUpdateResult> => {
  return (await getNativeVoltraAndroid().updateAndroidOngoingNotification(
    notificationId,
    serializeAndroidOngoingNotificationInput(input),
    getFilteredAndroidOngoingNotificationUpdateOptions(options)
  )) as AndroidOngoingNotificationUpdateResult
}

export const hasAndroidNotificationPermission = async (): Promise<boolean> => {
  if (Platform.OS !== 'android') {
    return false
  }

  if (!isAndroidNotificationPermissionRequired()) {
    return true
  }

  return PermissionsAndroid.check(NOTIFICATION_PERMISSION)
}

export const requestAndroidNotificationPermission = async (): Promise<boolean> => {
  if (Platform.OS !== 'android') {
    return false
  }

  if (!isAndroidNotificationPermissionRequired()) {
    return true
  }

  const result = await PermissionsAndroid.request(NOTIFICATION_PERMISSION)
  return result === PermissionsAndroid.RESULTS.GRANTED
}

export const openAndroidNotificationSettings = async (): Promise<void> => {
  if (Platform.OS !== 'android') {
    return
  }

  return getNativeVoltraAndroid().openAndroidNotificationSettings()
}

/**
 * Opens the system page where the user turns Live Updates on for this app. Resolves
 * true when the promotion settings page opened, false when it fell back to the app
 * notification settings (Android versions or devices without the promotion page).
 */
export const openAndroidPromotedNotificationSettings = async (): Promise<boolean> => {
  if (Platform.OS !== 'android') {
    return false
  }

  return getNativeVoltraAndroid().openAndroidPromotedNotificationSettings()
}

/**
 * Runs the same promotion checks as a post — on the same payload and channel — without
 * posting the notification or writing a record.
 */
export const checkAndroidOngoingNotificationPromotion = async (
  input: AndroidOngoingNotificationInput,
  options: CheckAndroidOngoingNotificationPromotionOptions
): Promise<AndroidOngoingNotificationCheckPromotionResult> => {
  return (await getNativeVoltraAndroid().checkAndroidOngoingNotificationPromotion(
    serializeAndroidOngoingNotificationInput(input),
    {
      channelId: options.channelId,
      smallIcon: options.smallIcon,
    }
  )) as AndroidOngoingNotificationCheckPromotionResult
}

export const stopAndroidOngoingNotification = async (
  notificationId: string
): Promise<AndroidOngoingNotificationStopResult> => {
  return (await getNativeVoltraAndroid().stopAndroidOngoingNotification(
    notificationId
  )) as AndroidOngoingNotificationStopResult
}

export const isAndroidOngoingNotificationActive = (notificationId: string): boolean => {
  return getNativeVoltraAndroid().isAndroidOngoingNotificationActive(notificationId)
}

export const getAndroidOngoingNotificationStatus = (notificationId: string): AndroidOngoingNotificationStatus => {
  return getNativeVoltraAndroid().getAndroidOngoingNotificationStatus(notificationId)
}

export async function endAllAndroidOngoingNotifications(): Promise<void> {
  return getNativeVoltraAndroid().endAllAndroidOngoingNotifications()
}

export const canPostPromotedAndroidNotifications = (): boolean => {
  return getNativeVoltraAndroid().canPostPromotedAndroidNotifications()
}

export const getAndroidOngoingNotificationCapabilities = (): AndroidOngoingNotificationCapabilities => {
  return getNativeVoltraAndroid().getAndroidOngoingNotificationCapabilities()
}
