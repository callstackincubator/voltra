import {
  clearWidgetInstanceConfiguration,
  getActiveWidgets,
  getWidgetInstanceConfiguration,
  setWidgetConfiguration,
  setWidgetInstanceConfiguration,
  type WidgetInfo,
} from '@use-voltra/android-client'
import { useRouter } from 'expo-router'
import React, { useCallback, useEffect, useState } from 'react'
import { ActivityIndicator, Platform, StyleSheet, Text, TextInput, View } from 'react-native'

import { Button } from '~/components/Button'
import { ScreenLayout } from '~/components/ScreenLayout'

const DYNAMIC_WIDGET_ID = 'AndroidClientDemoWidget'

export default function AndroidWidgetInstanceConfigScreen() {
  const router = useRouter()
  const [placements, setPlacements] = useState<WidgetInfo[]>([])
  const [values, setValues] = useState<Record<number, string>>({})
  const [drafts, setDrafts] = useState<Record<number, string>>({})
  const [loading, setLoading] = useState(false)
  const [typeLabel, setTypeLabel] = useState('')
  const [feedback, setFeedback] = useState<string | null>(null)

  const refresh = useCallback(async () => {
    if (Platform.OS !== 'android') {
      return
    }
    setLoading(true)
    try {
      const active = await getActiveWidgets()
      const demo = active.filter((widget) => widget.widgetType === DYNAMIC_WIDGET_ID)
      setPlacements(demo)

      // What each placement actually renders: defaults, then the widget-type values, then its own.
      const merged = await Promise.all(
        demo.map(async (widget) => {
          const configuration = await getWidgetInstanceConfiguration(widget.appWidgetId)
          return [widget.appWidgetId, configuration.label ?? ''] as const
        })
      )
      setValues(Object.fromEntries(merged))
      setFeedback(demo.length === 0 ? `Place "${DYNAMIC_WIDGET_ID}" on the Home Screen twice to try this.` : null)
    } catch (error) {
      setFeedback(error instanceof Error ? error.message : String(error))
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void refresh()
  }, [refresh])

  const run = async (action: () => Promise<void>, message: string) => {
    try {
      await action()
      setFeedback(message)
      await refresh()
    } catch (error) {
      setFeedback(error instanceof Error ? error.message : String(error))
    }
  }

  return (
    <ScreenLayout
      title="Per-placement configuration"
      description={`Every placement of ${DYNAMIC_WIDGET_ID} has its own appWidgetId, so each can show a different env.configuration.label.`}
    >
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Every placement</Text>
        <Text style={styles.hint}>
          Values written here shadow the widget-type value below. Clearing one makes it follow the widget-type value
          again.
        </Text>

        {loading && placements.length === 0 ? <ActivityIndicator color="#8232FF" style={styles.loading} /> : null}

        {placements.map((widget) => (
          <View key={widget.appWidgetId} style={styles.placement}>
            <Text style={styles.placementTitle}>
              appWidgetId {widget.appWidgetId} · {widget.width}×{widget.height}dp
            </Text>
            <Text style={styles.placementValue}>renders label: “{values[widget.appWidgetId] || '(unset)'}”</Text>
            <TextInput
              style={styles.input}
              value={drafts[widget.appWidgetId] ?? ''}
              onChangeText={(text) => setDrafts((current) => ({ ...current, [widget.appWidgetId]: text }))}
              placeholder="New label for this placement"
              placeholderTextColor="#64748B"
              accessibilityLabel={`Label for placement ${widget.appWidgetId}`}
            />
            <View style={styles.row}>
              <Button
                title="Set"
                style={styles.rowButton}
                onPress={() =>
                  run(
                    // The object form: several keys would cost one write and one re-render.
                    () =>
                      setWidgetInstanceConfiguration(widget.appWidgetId, {
                        label: drafts[widget.appWidgetId] ?? '',
                      }),
                    `Set label on placement ${widget.appWidgetId}.`
                  )
                }
              />
              <Button
                title="Clear"
                variant="secondary"
                style={styles.rowButton}
                onPress={() =>
                  run(
                    () => clearWidgetInstanceConfiguration(widget.appWidgetId),
                    `Cleared placement ${widget.appWidgetId}; it follows the widget-type value again.`
                  )
                }
              />
            </View>
          </View>
        ))}

        <Button title="Refresh placements" variant="ghost" onPress={() => void refresh()} />
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Every unconfigured placement</Text>
        <Text style={styles.hint}>
          setWidgetConfiguration writes the widget-type value. Placements with their own label keep showing it.
        </Text>
        <TextInput
          style={styles.input}
          value={typeLabel}
          onChangeText={setTypeLabel}
          placeholder="Label for the widget type"
          placeholderTextColor="#64748B"
          accessibilityLabel="Widget-type label"
        />
        <Button
          title="Set widget-type label"
          onPress={() =>
            run(
              () => setWidgetConfiguration(DYNAMIC_WIDGET_ID, 'label', typeLabel),
              'Set the widget-type label. Only placements without their own label changed.'
            )
          }
        />
      </View>

      {feedback ? <Text style={styles.feedback}>{feedback}</Text> : null}

      <View style={styles.footer}>
        <Button title="Back" variant="ghost" onPress={() => router.back()} />
      </View>
    </ScreenLayout>
  )
}

const styles = StyleSheet.create({
  section: {
    marginBottom: 28,
  },
  sectionTitle: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 6,
  },
  hint: {
    color: '#94A3B8',
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 14,
  },
  loading: {
    marginVertical: 16,
  },
  placement: {
    borderColor: 'rgba(130, 50, 255, 0.4)',
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 14,
    padding: 14,
  },
  placementTitle: {
    color: '#E2E8F0',
    fontSize: 14,
    fontWeight: '600',
  },
  placementValue: {
    color: '#94A3B8',
    fontSize: 13,
    marginBottom: 10,
    marginTop: 4,
  },
  input: {
    backgroundColor: 'rgba(130, 50, 255, 0.1)',
    borderColor: 'rgba(130, 50, 255, 0.4)',
    borderRadius: 10,
    borderWidth: 1,
    color: '#FFFFFF',
    marginBottom: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  row: {
    flexDirection: 'row',
    gap: 10,
  },
  rowButton: {
    flex: 1,
  },
  feedback: {
    color: '#E2E8F0',
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 20,
  },
  footer: {
    marginBottom: 40,
  },
})
