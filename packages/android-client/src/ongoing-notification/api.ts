import { useCallback, useEffect, useRef, useState } from 'react'
import { PermissionsAndroid, Platform } from 'react-native'

import {
  renderAndroidOngoingNotificationPayload,
  type AndroidOngoingNotificationCapabilities,
  type AndroidOngoingNotificationContent,
  type AndroidOngoingNotificationFallbackBehavior,
  type AndroidOngoingNotificationInput,
  type AndroidOngoingNotificationPayload,
  type AndroidOngoingNotificationStartResult,
  type AndroidOngoingNotificationStatus,
  type AndroidOngoingNotificationStopResult,
  type AndroidOngoingNotificationUpdateResult,
  type AndroidOngoingNotificationUpsertResult,
  type StartAndroidOngoingNotificationOptions,
  type UpdateAndroidOngoingNotificationOptions,
  type UseAndroidOngoingNotificationOptions,
  type UseAndroidOngoingNotificationResult,
} from '@use-voltra/android'

import { useUpdateOnHMR } from '../utils/index.js'
import VoltraModule from '../VoltraModule.js'

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

const getFilteredAndroidOngoingNotificationUpdateOptions = (
  options?: UpdateAndroidOngoingNotificationOptions | StartAndroidOngoingNotificationOptions
): UpdateAndroidOngoingNotificationOptions | undefined => {
  if (!options) {
    return undefined
  }

  const filteredOptions: UpdateAndroidOngoingNotificationOptions = {}

  if (options.channelId !== undefined) {
    filteredOptions.channelId = options.channelId
  }

  if (options.smallIcon !== undefined) {
    filteredOptions.smallIcon = options.smallIcon
  }

  if (options.deepLinkUrl !== undefined) {
    filteredOptions.deepLinkUrl = options.deepLinkUrl
  }

  if (options.requestPromotedOngoing !== undefined) {
    filteredOptions.requestPromotedOngoing = options.requestPromotedOngoing
  }

  if (options.fallbackBehavior !== undefined) {
    filteredOptions.fallbackBehavior = options.fallbackBehavior as AndroidOngoingNotificationFallbackBehavior
  }

  return Object.keys(filteredOptions).length > 0 ? filteredOptions : undefined
}

const getStartAndroidOngoingNotificationOptions = (
  _input: AndroidOngoingNotificationInput,
  options: StartAndroidOngoingNotificationOptions
): StartAndroidOngoingNotificationOptions => {
  return {
    notificationId: options.notificationId,
    channelId: options.channelId,
    smallIcon: options.smallIcon,
    deepLinkUrl: options.deepLinkUrl,
    requestPromotedOngoing: options.requestPromotedOngoing,
    fallbackBehavior: options.fallbackBehavior,
  }
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
  const optionsRef = useRef(options)
  const contentRef = useRef(content)
  const lastUpdateOptionsRef = useRef<UpdateAndroidOngoingNotificationOptions | undefined>(undefined)

  useEffect(() => {
    optionsRef.current = options
  }, [options])

  useEffect(() => {
    contentRef.current = content
  }, [content])

  useUpdateOnHMR()

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
      lastUpdateOptionsRef.current = updateOptions
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

  useEffect(() => {
    if (!options.autoStart || targetId) {
      return
    }

    void start()
  }, [options.autoStart, start, targetId])

  useEffect(() => {
    if (!options.autoUpdate || !targetId) {
      return
    }

    void update(lastUpdateOptionsRef.current)
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
  return (await VoltraModule.startAndroidOngoingNotification(
    serializeAndroidOngoingNotificationInput(input),
    getStartAndroidOngoingNotificationOptions(input, options)
  )) as AndroidOngoingNotificationStartResult
}

export const upsertAndroidOngoingNotification = async (
  input: AndroidOngoingNotificationInput,
  options: StartAndroidOngoingNotificationOptions
): Promise<AndroidOngoingNotificationUpsertResult> => {
  return (await VoltraModule.upsertAndroidOngoingNotification(
    serializeAndroidOngoingNotificationInput(input),
    getStartAndroidOngoingNotificationOptions(input, options)
  )) as AndroidOngoingNotificationUpsertResult
}

export const updateAndroidOngoingNotification = async (
  notificationId: string,
  input: AndroidOngoingNotificationInput,
  options?: UpdateAndroidOngoingNotificationOptions
): Promise<AndroidOngoingNotificationUpdateResult> => {
  return (await VoltraModule.updateAndroidOngoingNotification(
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

  return VoltraModule.openAndroidNotificationSettings()
}

export const stopAndroidOngoingNotification = async (
  notificationId: string
): Promise<AndroidOngoingNotificationStopResult> => {
  return (await VoltraModule.stopAndroidOngoingNotification(notificationId)) as AndroidOngoingNotificationStopResult
}

export const isAndroidOngoingNotificationActive = (notificationId: string): boolean => {
  return VoltraModule.isAndroidOngoingNotificationActive(notificationId)
}

export const getAndroidOngoingNotificationStatus = (notificationId: string): AndroidOngoingNotificationStatus => {
  return VoltraModule.getAndroidOngoingNotificationStatus(notificationId)
}

export async function endAllAndroidOngoingNotifications(): Promise<void> {
  return VoltraModule.endAllAndroidOngoingNotifications()
}

export const canPostPromotedAndroidNotifications = (): boolean => {
  return VoltraModule.canPostPromotedAndroidNotifications()
}

export const getAndroidOngoingNotificationCapabilities = (): AndroidOngoingNotificationCapabilities => {
  return VoltraModule.getAndroidOngoingNotificationCapabilities()
}
