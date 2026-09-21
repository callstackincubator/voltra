// Demonstrates ADR 0007 (per-instance server fetches) end to end: each placed widget carries its
// own `city` configuration, the fake server (example/server/widget-server.tsx) answers each
// placement's request differently keyed by `configuration`/`instance`, and this screen lets you
// drive the whole loop from one place for both platforms.
import {
  clearWidgetInstanceConfiguration,
  getActiveWidgets as getActiveAndroidWidgets,
  getWidgetInstanceConfiguration,
  getWidgetServerUpdate as getAndroidWidgetServerUpdate,
  reloadAndroidWidgets,
  requestPinAndroidWidget,
  setWidgetInstanceConfiguration,
  type WidgetInfo as AndroidWidgetInfo,
} from '@use-voltra/android-client'
import { getActiveWidgets as getActiveIosWidgets, reloadWidgets as reloadIosWidgets } from '@use-voltra/ios-client'
import { useRouter } from 'expo-router'
import React, { useCallback, useEffect, useState } from 'react'
import { ActivityIndicator, Platform, StyleSheet, Text, TextInput, View } from 'react-native'

import { Button } from '~/components/Button'
import { ScreenLayout } from '~/components/ScreenLayout'

const ANDROID_WIDGET_ID = 'AndroidClientDemoWidget'
const IOS_WIDGET_ID = 'ClientRenderedDemoWidget'

export default function PerInstanceServerFetchScreen() {
  const router = useRouter()

  return (
    <ScreenLayout
      title="Per-instance server fetches"
      description="ADR 0007: each placement of the demo widget has its own city, and the fake server answers each configuration differently."
    >
      {Platform.OS === 'android' ? <AndroidSection /> : <IosSection />}

      <View style={styles.footer}>
        <Button
          testID="go-to-previous-home"
          title="Go to previous home screen"
          variant="ghost"
          onPress={() => router.push(Platform.OS === 'android' ? '/android/activity' : '/ios/activity')}
        />
      </View>
    </ScreenLayout>
  )
}

function AndroidSection() {
  const [placements, setPlacements] = useState<AndroidWidgetInfo[]>([])
  const [cities, setCities] = useState<Record<number, string>>({})
  const [drafts, setDrafts] = useState<Record<number, string>>({})
  const [serverSettings, setServerSettings] = useState<Record<string, unknown> | null>(null)
  const [loading, setLoading] = useState(false)
  const [feedback, setFeedback] = useState<string | null>(null)

  const refresh = useCallback(async () => {
    setLoading(true)
    try {
      const active = await getActiveAndroidWidgets()
      const demo = active.filter((widget) => widget.widgetType === ANDROID_WIDGET_ID)
      setPlacements(demo)

      const merged = await Promise.all(
        demo.map(async (widget) => {
          const configuration = await getWidgetInstanceConfiguration(widget.appWidgetId)
          return [widget.appWidgetId, configuration.city ?? ''] as const
        })
      )
      setCities(Object.fromEntries(merged))

      const settings = await getAndroidWidgetServerUpdate({ widgetId: ANDROID_WIDGET_ID })
      setServerSettings(settings as Record<string, unknown> | null)

      setFeedback(
        demo.length === 0
          ? `No placements yet. Request a pin below, then add "${ANDROID_WIDGET_ID}" from the system dialog.`
          : null
      )
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
    <>
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Placements ({ANDROID_WIDGET_ID})</Text>
        <Text style={styles.hint}>
          Each appWidgetId gets its own `city`. The server logs one request per distinct configuration.
        </Text>

        {loading && placements.length === 0 ? <ActivityIndicator color="#8232FF" style={styles.loading} /> : null}

        {placements.map((widget) => (
          <View key={widget.appWidgetId} testID={`placement-${widget.appWidgetId}`} style={styles.placement}>
            <Text style={styles.placementTitle}>appWidgetId {widget.appWidgetId}</Text>
            <Text style={styles.placementValue}>
              current city: "{cities[widget.appWidgetId] || '(unset → London default)'}"
            </Text>
            <TextInput
              testID={`city-input-${widget.appWidgetId}`}
              style={styles.input}
              value={drafts[widget.appWidgetId] ?? ''}
              onChangeText={(text) => setDrafts((current) => ({ ...current, [widget.appWidgetId]: text }))}
              placeholder="City, e.g. Paris"
              placeholderTextColor="#64748B"
              autoCapitalize="none"
              accessibilityLabel={`City for placement ${widget.appWidgetId}`}
            />
            <View style={styles.row}>
              <Button
                testID={`set-city-${widget.appWidgetId}`}
                title="Set city"
                style={styles.rowButton}
                onPress={() =>
                  run(
                    () =>
                      setWidgetInstanceConfiguration(widget.appWidgetId, { city: drafts[widget.appWidgetId] ?? '' }),
                    `Set city on placement ${widget.appWidgetId}.`
                  )
                }
              />
              <Button
                testID={`clear-city-${widget.appWidgetId}`}
                title="Clear"
                variant="secondary"
                style={styles.rowButton}
                onPress={() =>
                  run(
                    () => clearWidgetInstanceConfiguration(widget.appWidgetId),
                    `Cleared placement ${widget.appWidgetId}.`
                  )
                }
              />
            </View>
          </View>
        ))}

        <Button testID="refresh-placements" title="Refresh placements" variant="ghost" onPress={() => void refresh()} />
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Pin a new placement</Text>
        <Button
          testID="request-pin"
          title={`Request pin: ${ANDROID_WIDGET_ID}`}
          onPress={() =>
            run(async () => {
              const ok = await requestPinAndroidWidget(ANDROID_WIDGET_ID, { previewWidth: 250, previewHeight: 150 })
              if (!ok) {
                throw new Error('Pin request not supported on this device.')
              }
            }, 'Pin requested. Accept the system dialog to place it on the Home Screen.')
          }
        />
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Reload</Text>
        <Button
          testID="reload-android-widgets"
          title="Reload Android widgets"
          onPress={() => run(() => reloadAndroidWidgets([ANDROID_WIDGET_ID]), 'Reload triggered.')}
        />
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Resolved server settings</Text>
        <Text testID="server-settings" style={styles.hint}>
          {serverSettings ? JSON.stringify(serverSettings) : '(not server-driven or not loaded yet)'}
        </Text>
      </View>

      {feedback ? (
        <Text testID="feedback" style={styles.feedback}>
          {feedback}
        </Text>
      ) : null}
    </>
  )
}

function IosSection() {
  const [placements, setPlacements] = useState<Awaited<ReturnType<typeof getActiveIosWidgets>>>([])
  const [feedback, setFeedback] = useState<string | null>(null)

  const refresh = useCallback(async () => {
    try {
      const active = await getActiveIosWidgets()
      setPlacements(
        active.filter((widget: any) => widget.widgetType === IOS_WIDGET_ID || widget.kind === IOS_WIDGET_ID)
      )
      setFeedback(null)
    } catch (error) {
      setFeedback(error instanceof Error ? error.message : String(error))
    }
  }, [])

  useEffect(() => {
    void refresh()
  }, [refresh])

  return (
    <>
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>iOS configuration</Text>
        <Text style={styles.hint}>
          iOS has no runtime configuration API: place "{IOS_WIDGET_ID}" on the Home Screen, then long-press it and
          choose Edit Widget to change its `city`. WidgetKit hands the merged configuration straight to the widget and
          to the server request — there is no separate per-placement id, only the configuration itself.
        </Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Active placements</Text>
        <Text testID="ios-placements" style={styles.hint}>
          {placements.length === 0 ? '(none placed yet)' : JSON.stringify(placements)}
        </Text>
        <Button testID="refresh-placements" title="Refresh placements" variant="ghost" onPress={() => void refresh()} />
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Reload</Text>
        <Button
          testID="reload-ios-widgets"
          title="Reload iOS widgets"
          onPress={() => reloadIosWidgets([IOS_WIDGET_ID])}
        />
      </View>

      {feedback ? (
        <Text testID="feedback" style={styles.feedback}>
          {feedback}
        </Text>
      ) : null}
    </>
  )
}

const styles = StyleSheet.create({
  section: { marginBottom: 24 },
  sectionTitle: { color: '#FFFFFF', fontSize: 16, fontWeight: '600', marginBottom: 6 },
  hint: { color: '#94A3B8', fontSize: 13, lineHeight: 18, marginBottom: 10 },
  loading: { marginVertical: 16 },
  placement: {
    borderColor: 'rgba(130, 50, 255, 0.4)',
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 14,
    padding: 14,
  },
  placementTitle: { color: '#E2E8F0', fontSize: 14, fontWeight: '600' },
  placementValue: { color: '#94A3B8', fontSize: 13, marginBottom: 10, marginTop: 4 },
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
  row: { flexDirection: 'row', gap: 10 },
  rowButton: { flex: 1 },
  feedback: { color: '#E2E8F0', fontSize: 13, lineHeight: 18, marginBottom: 20 },
  footer: { marginBottom: 40, marginTop: 8 },
})
