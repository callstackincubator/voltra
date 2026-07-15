import { useLocalSearchParams, useRouter } from 'expo-router'
import { useState } from 'react'
import { Alert, StyleSheet, Text, TextInput, View } from 'react-native'
import {
  cancelWidgetConfiguration,
  completeWidgetConfiguration,
  setWidgetInstanceConfiguration,
} from '@use-voltra/android-client'

import { Button } from '~/components/Button'

export default function DeepLinkIndexScreen() {
  const { activityName, appWidgetId, widgetId } = useLocalSearchParams<{
    activityName: string
    appWidgetId?: string
    widgetId?: string
  }>()
  const router = useRouter()
  const isWidgetConfig = activityName === 'android-widget-config'
  const parsedAppWidgetId = typeof appWidgetId === 'string' ? Number(appWidgetId) : Number.NaN
  const [label, setLabel] = useState('Hello')
  const [saving, setSaving] = useState(false)

  const saveWidgetConfiguration = async () => {
    if (!Number.isFinite(parsedAppWidgetId)) {
      Alert.alert('Missing widget id', 'The configuration activity did not receive a valid appWidgetId.')
      return
    }

    setSaving(true)
    try {
      await setWidgetInstanceConfiguration(parsedAppWidgetId, 'label', label)
      await completeWidgetConfiguration(parsedAppWidgetId)
    } catch (error: any) {
      Alert.alert('Error', error?.message || String(error))
    } finally {
      setSaving(false)
    }
  }

  const goBack = () => {
    if (isWidgetConfig) {
      cancelWidgetConfiguration().catch(() => {})
      return
    }

    if (router.canGoBack()) {
      router.back()
    } else {
      router.replace('/')
    }
  }

  if (isWidgetConfig) {
    return (
      <View style={[styles.root]}>
        <View style={styles.content}>
          <Text style={styles.title}>Configure widget instance</Text>
          <Text style={styles.activityText}>Widget type: {widgetId}</Text>
          <Text style={styles.activityText}>Instance: #{appWidgetId}</Text>

          <View style={styles.form}>
            <Text style={styles.label}>env.configuration.label</Text>
            <TextInput
              style={styles.input}
              value={label}
              onChangeText={setLabel}
              placeholder="Label"
              placeholderTextColor="#64748B"
            />
          </View>

          <View style={styles.buttonRow}>
            <Button title={saving ? 'Saving...' : 'Save'} onPress={saveWidgetConfiguration} disabled={saving} />
            <Button title="Cancel" variant="secondary" onPress={goBack} />
          </View>
        </View>
      </View>
    )
  }

  return (
    <View style={[styles.root]}>
      <View style={styles.content}>
        <Text style={styles.title}>You&apos;ve been deep linked via Voltra</Text>

        <Text style={styles.activityText}>Activity: {activityName}</Text>

        <Button title="Go back" onPress={goBack} />
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  root: {
    flexDirection: 'column',
    justifyContent: 'flex-end',
    paddingTop: 32,
    paddingHorizontal: 16,
    paddingBottom: 0,
  },
  content: {
    flexDirection: 'column',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 16,
  },
  form: {
    width: '100%',
    gap: 8,
  },
  label: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
  },
  input: {
    minWidth: 260,
    width: '100%',
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderColor: 'rgba(255, 255, 255, 0.18)',
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    color: 'white',
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  title: {
    color: 'white',
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  activityText: {
    color: 'white',
    fontSize: 18,
    textAlign: 'center',
  },
})
