import * as Notifications from 'expo-notifications'
import { Platform } from 'react-native'
import type { AndroidOngoingNotificationPayload } from 'voltra/android'
import type { StartAndroidOngoingNotificationOptions } from 'voltra/android/client'
import { stopAndroidOngoingNotification, upsertAndroidOngoingNotification } from 'voltra/android/client'

export const VOLTRA_BACKGROUND_NOTIFICATION_TASK = 'voltra-background-notification-task'
const DEFAULT_CHANNEL_ID = 'voltra_live_updates'

type VoltraOngoingNotificationOperation = 'upsert' | 'stop'

type VoltraOngoingNotificationMessage = {
  notificationId?: unknown
  payload?: unknown
  operation?: unknown
  options?: unknown
  channelId?: unknown
  smallIcon?: unknown
  deepLinkUrl?: unknown
  requestPromotedOngoing?: unknown
  fallbackBehavior?: unknown
}

type NotificationTaskPayloadData = {
  data?: unknown
}

const isRecord = (value: unknown): value is Record<string, unknown> => {
  return typeof value === 'object' && value !== null
}

const parseJsonString = (value: string): unknown => {
  try {
    return JSON.parse(value)
  } catch {
    return null
  }
}

const getVoltraMessageCandidate = (value: unknown): Record<string, unknown> | null => {
  if (typeof value === 'string') {
    const parsed = parseJsonString(value)
    return isRecord(parsed) ? parsed : null
  }

  return isRecord(value) ? value : null
}

const extractNestedDataRecord = (value: unknown): Record<string, unknown> | null => {
  if (!isRecord(value)) {
    return null
  }

  if (isRecord(value.data)) {
    return value.data
  }

  if (typeof value.dataString === 'string') {
    const parsed = parseJsonString(value.dataString)
    return isRecord(parsed) ? parsed : null
  }

  if (typeof value.body === 'string') {
    const parsed = parseJsonString(value.body)
    return isRecord(parsed) ? parsed : null
  }

  return value
}

const getTaskPayloadData = (data: unknown): unknown => {
  if (!isRecord(data)) {
    return data
  }

  const nestedData = extractNestedDataRecord(data)
  if (nestedData) {
    return nestedData
  }

  return data
}

const getMessageFromData = (data: unknown): VoltraOngoingNotificationMessage | null => {
  const payloadData = getTaskPayloadData(data)
  if (!isRecord(payloadData)) {
    return null
  }

  const directCandidate = getVoltraMessageCandidate(payloadData.voltraOngoingNotification)
  if (directCandidate) {
    return directCandidate as VoltraOngoingNotificationMessage
  }

  const bodyCandidate = getVoltraMessageCandidate(payloadData.body)
  if (bodyCandidate?.voltraOngoingNotification) {
    return getVoltraMessageCandidate(bodyCandidate.voltraOngoingNotification) as VoltraOngoingNotificationMessage | null
  }

  const dataStringCandidate = getVoltraMessageCandidate(payloadData.dataString)
  if (dataStringCandidate?.voltraOngoingNotification) {
    return getVoltraMessageCandidate(
      dataStringCandidate.voltraOngoingNotification
    ) as VoltraOngoingNotificationMessage | null
  }

  return null
}

const parseOperation = (value: unknown): VoltraOngoingNotificationOperation => {
  return value === 'stop' ? 'stop' : 'upsert'
}

const parsePayload = (value: unknown): AndroidOngoingNotificationPayload | string | null => {
  if (typeof value === 'string') {
    const parsed = parseJsonString(value)
    return parsed ? (parsed as AndroidOngoingNotificationPayload) : value
  }

  return value ? (value as AndroidOngoingNotificationPayload) : null
}

const parseString = (value: unknown): string | undefined => {
  return typeof value === 'string' && value ? value : undefined
}

const parseBoolean = (value: unknown): boolean | undefined => {
  return typeof value === 'boolean' ? value : undefined
}

const parseOptions = (
  message: VoltraOngoingNotificationMessage
): StartAndroidOngoingNotificationOptions | undefined => {
  const rawOptions = isRecord(message.options)
    ? message.options
    : typeof message.options === 'string'
    ? parseJsonString(message.options)
    : null

  const mergedOptions = {
    ...(isRecord(rawOptions) ? rawOptions : {}),
    channelId: parseString(message.channelId) ?? (isRecord(rawOptions) ? parseString(rawOptions.channelId) : undefined),
    smallIcon: parseString(message.smallIcon) ?? (isRecord(rawOptions) ? parseString(rawOptions.smallIcon) : undefined),
    deepLinkUrl:
      parseString(message.deepLinkUrl) ?? (isRecord(rawOptions) ? parseString(rawOptions.deepLinkUrl) : undefined),
    requestPromotedOngoing:
      parseBoolean(message.requestPromotedOngoing) ??
      (isRecord(rawOptions) ? parseBoolean(rawOptions.requestPromotedOngoing) : undefined),
    fallbackBehavior:
      parseString(message.fallbackBehavior) ??
      (isRecord(rawOptions) ? parseString(rawOptions.fallbackBehavior) : undefined),
  }

  const options: StartAndroidOngoingNotificationOptions = {
    channelId: DEFAULT_CHANNEL_ID,
  }

  if (mergedOptions.channelId !== undefined) {
    options.channelId = mergedOptions.channelId
  }

  if (mergedOptions.smallIcon !== undefined) {
    options.smallIcon = mergedOptions.smallIcon
  }

  if (mergedOptions.deepLinkUrl !== undefined) {
    options.deepLinkUrl = mergedOptions.deepLinkUrl
  }

  if (mergedOptions.requestPromotedOngoing !== undefined) {
    options.requestPromotedOngoing = mergedOptions.requestPromotedOngoing
  }

  if (mergedOptions.fallbackBehavior !== undefined) {
    options.fallbackBehavior =
      mergedOptions.fallbackBehavior as StartAndroidOngoingNotificationOptions['fallbackBehavior']
  }

  return options
}

export const ensureOngoingNotificationChannel = async (channelId = DEFAULT_CHANNEL_ID) => {
  if (Platform.OS !== 'android') {
    return
  }

  await Notifications.setNotificationChannelAsync(channelId, {
    name: 'Voltra Ongoing Notifications',
    description: 'Background Android ongoing notification tests for Voltra',
    importance: Notifications.AndroidImportance.HIGH,
    vibrationPattern: [0, 200, 150, 200],
    lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
    showBadge: false,
  })
}

export const processVoltraOngoingNotificationMessage = async (data: unknown) => {
  if (Platform.OS !== 'android') {
    return { processed: false, reason: 'unsupported_platform' as const }
  }

  const message = getMessageFromData(data)
  if (!message) {
    console.log('[voltra-background-task] Ignored task: no voltraOngoingNotification payload.')
    return { processed: false, reason: 'missing_message' as const }
  }

  const notificationId = typeof message.notificationId === 'string' ? message.notificationId : null
  if (!notificationId) {
    console.log('[voltra-background-task] Ignored task: missing notificationId.')
    return { processed: false, reason: 'missing_notification_id' as const }
  }

  const options = parseOptions(message)
  const channelId = options?.channelId ?? DEFAULT_CHANNEL_ID
  await ensureOngoingNotificationChannel(channelId)

  const operation = parseOperation(message.operation)
  if (operation === 'stop') {
    const result = await stopAndroidOngoingNotification(notificationId)
    console.log('[voltra-background-task] Stop ongoing notification result:', result)
    return { processed: result.ok, notificationId, result }
  }

  const payload = parsePayload(message.payload)
  if (!payload) {
    console.log('[voltra-background-task] Ignored task: missing payload for ongoing notification:', notificationId)
    return { processed: false, notificationId, reason: 'missing_payload' as const }
  }

  const result = await upsertAndroidOngoingNotification(payload, { ...options, notificationId })
  console.log('[voltra-background-task] Upsert ongoing notification result:', result)
  return { processed: result.ok, notificationId, result }
}

export const handleBackgroundNotificationTask = async ({ data }: NotificationTaskPayloadData) => {
  try {
    await processVoltraOngoingNotificationMessage(data)
  } catch (error) {
    console.log('[voltra-background-task] Handler failed:', error)
    throw error
  }
}
