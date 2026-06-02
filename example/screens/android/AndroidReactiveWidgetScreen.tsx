import { useRouter } from 'expo-router'
import React, { useState } from 'react'
import { Alert, Platform, StyleSheet, Text, TextInput, View } from 'react-native'
import { setAppIntentParam } from '@use-voltra/android-client'

import { Button } from '~/components/Button'
import { ScreenLayout } from '~/components/ScreenLayout'

/**
 * Track 4 PoC — in-app stand-in for a future Glance configuration activity.
 * Writes the `city` AppIntent parameter into Voltra's DataStore and triggers a
 * Glance update; the Hermes resolver substitutes the placeholder at render
 * time and the widget re-renders with the new value.
 */
export default function AndroidReactiveWidgetScreen() {
  const router = useRouter()
  const [city, setCity] = useState('')
  const [busy, setBusy] = useState(false)

  const handleSubmit = async () => {
    if (Platform.OS !== 'android') {
      Alert.alert('Not available', 'This screen demonstrates the Android-only Track 4 PoC.')
      return
    }
    const value = city.trim()
    if (!value) {
      Alert.alert('Empty input', 'Type a city name before submitting.')
      return
    }
    setBusy(true)
    try {
      await setAppIntentParam('android_reactive_weather', 'city', value)
      Alert.alert(
        'Param updated',
        `Wrote city="${value}" to DataStore and triggered the Glance update. The Reactive Weather widget should now show "${value}".`
      )
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : String(e)
      Alert.alert('Error', `Failed to update param: ${message}`)
    } finally {
      setBusy(false)
    }
  }

  return (
    <ScreenLayout
      title="Reactive Widget (Track 4)"
      description="Change the AppIntent `city` parameter for the Reactive Weather widget. Hermes resolves the placeholder at render time — no server push, no app update."
    >
      <View style={styles.section}>
        <Text style={styles.label}>City</Text>
        <TextInput
          style={styles.input}
          value={city}
          onChangeText={setCity}
          placeholder="e.g. Warsaw, Tokyo, Lisbon"
          placeholderTextColor="#94A3B8"
          autoCorrect={false}
          autoCapitalize="words"
          returnKeyType="done"
          onSubmitEditing={handleSubmit}
          editable={!busy}
        />
        <Text style={styles.hint}>Add the "Reactive Weather (Track 4)" widget to your home screen first.</Text>
      </View>

      <View style={styles.section}>
        <Button
          title={busy ? 'Updating…' : 'Submit'}
          variant="primary"
          onPress={handleSubmit}
          disabled={busy || !city.trim()}
        />
      </View>

      <View style={styles.footer}>
        <Button title="Back" variant="ghost" onPress={() => router.back()} />
      </View>
    </ScreenLayout>
  )
}

const styles = StyleSheet.create({
  section: {
    marginBottom: 24,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#E2E8F0',
    marginBottom: 8,
  },
  input: {
    backgroundColor: 'rgba(130, 50, 255, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(130, 50, 255, 0.4)',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: '#FFFFFF',
  },
  hint: {
    fontSize: 12,
    color: '#94A3B8',
    marginTop: 8,
  },
  footer: {
    marginTop: 24,
    alignItems: 'center',
  },
})
