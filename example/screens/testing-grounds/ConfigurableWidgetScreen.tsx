import { useFocusEffect, useRouter } from 'expo-router'
import React, { useCallback, useState } from 'react'
import { ScrollView, StyleSheet, Text, View } from 'react-native'
import { getWidgetParameters, updateWidget, VoltraWidgetPreview } from 'voltra/client'

import { Button } from '~/components/Button'
import { Card } from '~/components/Card'
import {
  IosGreetingWidget,
  type GreetingName,
  type GreetingTheme,
} from '~/widgets/ios/IosGreetingWidget'

const WIDGET_ID = 'greeting'

interface GreetingParams {
  name: GreetingName
  theme: GreetingTheme
  showEmoji: boolean
}

const DEFAULT_PARAMS: GreetingParams = {
  name: 'friend',
  theme: 'purple',
  showEmoji: true,
}

function parseParams(raw: Record<string, string>): GreetingParams {
  return {
    name: (raw.name as GreetingName) ?? DEFAULT_PARAMS.name,
    theme: (raw.theme as GreetingTheme) ?? DEFAULT_PARAMS.theme,
    showEmoji: raw.showEmoji !== undefined ? raw.showEmoji === 'true' : DEFAULT_PARAMS.showEmoji,
  }
}

export default function ConfigurableWidgetScreen() {
  const router = useRouter()
  const [rawParams, setRawParams] = useState<Record<string, string>>({})
  const [previewParams, setPreviewParams] = useState<GreetingParams>(DEFAULT_PARAMS)
  const [isUpdating, setIsUpdating] = useState(false)

  // On every focus (including returning from the home screen after editing the widget),
  // read the latest parameters and re-render the widget automatically.
  useFocusEffect(
    useCallback(() => {
      const params = getWidgetParameters(WIDGET_ID)
      setRawParams(params)

      const parsed = Object.keys(params).length > 0 ? parseParams(params) : DEFAULT_PARAMS
      setPreviewParams(parsed)

      updateWidget(WIDGET_ID, {
        systemSmall: <IosGreetingWidget {...parsed} />,
        systemMedium: <IosGreetingWidget {...parsed} />,
      }).catch((e) => console.error('Failed to update greeting widget:', e))
    }, [])
  )

  const handleRefresh = useCallback(async () => {
    setIsUpdating(true)
    try {
      const params = getWidgetParameters(WIDGET_ID)
      setRawParams(params)

      const parsed = Object.keys(params).length > 0 ? parseParams(params) : DEFAULT_PARAMS
      setPreviewParams(parsed)

      await updateWidget(WIDGET_ID, {
        systemSmall: <IosGreetingWidget {...parsed} />,
        systemMedium: <IosGreetingWidget {...parsed} />,
      })
    } catch (e) {
      console.error('Failed to refresh greeting widget:', e)
    } finally {
      setIsUpdating(false)
    }
  }, [])

  return (
    <View style={styles.container}>
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.content}>
        <Text style={styles.heading}>Configurable Widget</Text>
        <Text style={styles.subheading}>
          The Greeting Widget supports the "Edit Widget" button on iOS 17+. Long-press it on the home
          screen to change the name, theme, or emoji — then come back here to see the app pick up the
          new parameters automatically.
        </Text>

        <Card>
          <Card.Title>Widget Preview</Card.Title>
          <Card.Text>Updated automatically each time this screen is focused.</Card.Text>
          <View style={styles.previews}>
            <View style={styles.previewItem}>
              <Text style={styles.previewLabel}>Small</Text>
              <VoltraWidgetPreview family="systemSmall" style={styles.previewCard}>
                <IosGreetingWidget {...previewParams} />
              </VoltraWidgetPreview>
            </View>
            <View style={styles.previewItem}>
              <Text style={styles.previewLabel}>Medium</Text>
              <VoltraWidgetPreview family="systemMedium" style={styles.previewCard}>
                <IosGreetingWidget {...previewParams} />
              </VoltraWidgetPreview>
            </View>
          </View>
          <Button
            title={isUpdating ? 'Refreshing…' : 'Refresh Now'}
            variant="secondary"
            onPress={handleRefresh}
            disabled={isUpdating}
            style={styles.button}
          />
        </Card>

        <Card>
          <Card.Title>Current Parameters</Card.Title>
          {Object.keys(rawParams).length === 0 ? (
            <Card.Text>
              No parameters stored yet. Add the Greeting widget to your home screen and edit it first.
            </Card.Text>
          ) : (
            <View style={styles.paramsTable}>
              {Object.entries(rawParams).map(([key, value]) => (
                <View key={key} style={styles.paramRow}>
                  <Text style={styles.paramKey}>{key}</Text>
                  <Text style={styles.paramValue}>{value}</Text>
                </View>
              ))}
            </View>
          )}
        </Card>

        <Card>
          <Card.Title>How to Test</Card.Title>
          <Card.Text>
            1. Build and run the app, then add the Greeting Widget to your home screen{'\n'}
            2. Long-press the widget and tap "Edit Widget"{'\n'}
            3. Change the Name, Theme, or toggle Show Emoji{'\n'}
            4. Switch back to the app — the preview and home screen widget update automatically{'\n'}
            5. The parameter table shows the raw values as stored by the widget extension
          </Card.Text>
        </Card>

        <View style={styles.footer}>
          <Button title="Back" variant="ghost" onPress={() => router.back()} />
        </View>
      </ScrollView>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollView: { flex: 1 },
  content: { paddingHorizontal: 20, paddingVertical: 24 },
  heading: { fontSize: 24, fontWeight: '700', color: '#FFFFFF', marginBottom: 8 },
  subheading: { fontSize: 14, lineHeight: 20, color: '#CBD5F5', marginBottom: 24 },
  previews: { flexDirection: 'row', gap: 16, marginTop: 16, flexWrap: 'wrap' },
  previewItem: { alignItems: 'center', gap: 8 },
  previewLabel: { fontSize: 12, color: '#CBD5F5' },
  previewCard: { borderRadius: 16, overflow: 'hidden' },
  paramsTable: { marginTop: 8, gap: 6 },
  paramRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 4 },
  paramKey: { fontSize: 14, color: '#CBD5F5', fontFamily: 'monospace' },
  paramValue: { fontSize: 14, color: '#FFFFFF', fontWeight: '500' },
  button: { marginTop: 16 },
  footer: { marginTop: 24, alignItems: 'center' },
})
