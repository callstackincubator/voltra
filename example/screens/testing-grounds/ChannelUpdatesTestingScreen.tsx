import { useRouter } from 'expo-router'
import React, { useMemo, useState } from 'react'
import { Alert, Platform, StyleSheet, View } from 'react-native'
import { Voltra } from '@use-voltra/ios'
import { useLiveActivity } from '@use-voltra/ios-client'

import { Button } from '~/components/Button'
import { Card } from '~/components/Card'
import { ScreenLayout } from '~/components/ScreenLayout'
import { TextInput } from '~/components/TextInput'

export default function ChannelUpdatesTestingScreen() {
  const router = useRouter()
  const [channelId, setChannelId] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const trimmedChannelId = channelId.trim()

  const variants = useMemo(
    () => ({
      lockScreen: {
        content: <Voltra.Text>Waiting for updates...</Voltra.Text>,
      },
      island: {
        minimal: <Voltra.Text>Waiting for updates...</Voltra.Text>,
      },
    }),
    []
  )

  const { start } = useLiveActivity(variants, {
    activityName: 'channel-based-updates',
    autoUpdate: false,
    channelId: trimmedChannelId || undefined,
  })

  const handleShowLiveActivity = async () => {
    if (!trimmedChannelId) {
      Alert.alert('Channel ID required', 'Provide channel ID before starting a Live Activity.')
      return
    }

    setIsSubmitting(true)
    try {
      await start()
    } catch (error) {
      console.error('Failed to start channel-based Live Activity:', error)
      Alert.alert('Unable to start', 'Check logs for more details.')
    } finally {
      setIsSubmitting(false)
    }
  }

  if (Platform.OS !== 'ios') {
    return null
  }

  return (
    <ScreenLayout
      title="Channel-Based Updates"
      description="Start a minimal Live Activity subscribed to a specific broadcast channel."
    >
      <Card>
        <Card.Title>Live Activity Channel</Card.Title>
        <Card.Text>Use an APNs broadcast channel ID for this activity.</Card.Text>
        <View style={styles.inputContainer}>
          <TextInput
            value={channelId}
            onChangeText={setChannelId}
            placeholder="e.g. com.voltra.example.channel"
            autoCapitalize="none"
            autoCorrect={false}
          />
        </View>

        <View style={styles.buttonContainer}>
          <Button
            title={isSubmitting ? 'Starting...' : 'Show live activity'}
            onPress={handleShowLiveActivity}
            disabled={isSubmitting}
          />
        </View>
      </Card>

      <View style={styles.footer}>
        <Button title="Back to Testing Grounds" variant="ghost" onPress={() => router.back()} />
      </View>
    </ScreenLayout>
  )
}

const styles = StyleSheet.create({
  inputContainer: {
    marginTop: 16,
  },
  buttonContainer: {
    marginTop: 16,
  },
  footer: {
    marginTop: 24,
    alignItems: 'center',
  },
})
