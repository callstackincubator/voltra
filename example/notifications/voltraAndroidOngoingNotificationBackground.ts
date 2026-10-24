import * as Notifications from 'expo-notifications'
import { Platform } from 'react-native'
import { handleAndroidOngoingNotificationPush } from '@use-voltra/android-client'

export const VOLTRA_BACKGROUND_NOTIFICATION_TASK = 'voltra-background-notification-task'
const DEFAULT_CHANNEL_ID = 'voltra_live_updates'

type NotificationTaskPayloadData = {
  data?: unknown
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

export const processVoltraOngoingNotificationMessage = (data: unknown) =>
  handleAndroidOngoingNotificationPush(data, {
    defaults: { channelId: DEFAULT_CHANNEL_ID },
    ensureChannel: ensureOngoingNotificationChannel,
  })

export const handleBackgroundNotificationTask = async ({ data }: NotificationTaskPayloadData) => {
  const result = await processVoltraOngoingNotificationMessage(data)
  console.log('[voltra-background-task] Ongoing notification push result:', result)
}
