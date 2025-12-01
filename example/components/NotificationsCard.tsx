import * as Notifications from 'expo-notifications'
import { useFocusEffect } from 'expo-router'
import { useCallback, useEffect, useState } from 'react'
import { AppState, Linking, StyleSheet } from 'react-native'

import { Button } from './Button'
import { Card } from './Card'

type NotificationsStatus = {
  isApproved: boolean
  canAskAgain: boolean
}

export const NotificationsCard = () => {
  const [status, setStatus] = useState<NotificationsStatus | null>(null)
  const isApproved = status?.isApproved ?? null
  const canAskAgain = status?.canAskAgain ?? null

  const checkPermissions = useCallback(() => {
    Notifications.getPermissionsAsync().then((permissions) => {
      setStatus({
        isApproved: permissions.granted,
        canAskAgain: permissions.canAskAgain,
      })
    })
  }, [])

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') {
        checkPermissions()
      }
    })
    return () => subscription.remove()
  }, [checkPermissions])

  useFocusEffect(checkPermissions)

  const handleAskForPermissions = () => {
    if (!canAskAgain) {
      Linking.openSettings().catch(() => {})
      return
    }

    Notifications.requestPermissionsAsync({
      ios: {
        allowAlert: false,
        allowBadge: false,
        allowSound: false,
      },
    }).then((permissions) => {
      setStatus({
        isApproved: permissions.granted,
        canAskAgain: permissions.canAskAgain,
      })
    })
  }

  return (
    <Card>
      <Card.Title>Notifications</Card.Title>
      <Card.Text>
        To test updating Live Activities via push notifications, you&apos;ll need to grant notification permissions.
      </Card.Text>
      <Button
        style={styles.button}
        title={isApproved ? 'Permissions granted' : 'Enable notifications'}
        disabled={isApproved === null || isApproved}
        onPress={handleAskForPermissions}
      />
    </Card>
  )
}

const styles = StyleSheet.create({
  button: {
    marginTop: 16,
  },
})
