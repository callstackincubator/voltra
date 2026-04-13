import Constants from 'expo-constants'
import * as Notifications from 'expo-notifications'
import { Platform } from 'react-native'

import { ensureOngoingNotificationChannel } from './voltraAndroidOngoingNotificationBackground'

let pushLoggingRegistration: Promise<void> | null = null

const getProjectId = () => {
  return Constants.expoConfig?.extra?.eas?.projectId ?? Constants.easConfig?.projectId ?? null
}

export const registerPushLogging = async () => {
  if (pushLoggingRegistration) {
    return pushLoggingRegistration
  }

  pushLoggingRegistration = (async () => {
    await ensureOngoingNotificationChannel()

    const existingPermissions = await Notifications.getPermissionsAsync()
    let finalStatus = existingPermissions.status

    if (finalStatus !== 'granted') {
      const requestedPermissions = await Notifications.requestPermissionsAsync()
      finalStatus = requestedPermissions.status
    }

    if (finalStatus !== 'granted') {
      console.log('[expo-notifications] Push permissions not granted:', finalStatus)
      return
    }

    try {
      const deviceToken = await Notifications.getDevicePushTokenAsync()
      console.log('[expo-notifications] Device push token:', deviceToken)
    } catch (error) {
      console.log('[expo-notifications] Failed to fetch device push token:', error)
    }

    const projectId = getProjectId()
    if (!projectId) {
      console.log('[expo-notifications] Missing EAS projectId; skipping Expo push token fetch.')
      return
    }

    try {
      const expoToken = await Notifications.getExpoPushTokenAsync({ projectId })
      console.log('[expo-notifications] Expo push token:', expoToken.data)
    } catch (error) {
      console.log('[expo-notifications] Failed to fetch Expo push token:', error)
    }

    if (Platform.OS === 'android') {
      const channels = await Notifications.getNotificationChannelsAsync()
      console.log('[expo-notifications] Android channels:', channels?.map((channel) => channel.id) ?? [])
    }
  })()

  return pushLoggingRegistration
}
