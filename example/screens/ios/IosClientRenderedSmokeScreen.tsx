import { useRouter } from 'expo-router'
import React, { useState } from 'react'
import { Alert, Platform, ScrollView, StyleSheet, Text, View } from 'react-native'
import { voltraWidgetEvalBundle, voltraWidgetRender } from '@use-voltra/ios-client'

import { Button } from '~/components/Button'
import { ScreenLayout } from '~/components/ScreenLayout'

const WIDGET_ID = 'Track5DemoWidget'
const METRO_BASE_URL = 'http://localhost:8081'

/**
 * Track 5 / Phase 3a — runtime smoke test.
 *
 * Tap the button:
 *  1. Fetch the widget bundle from Metro (the maintainer's /voltra/widgets/<id>.bundle endpoint)
 *  2. Hand the raw source to native, which evals it in the shared JSContext
 *  3. Call render(props, env) with hardcoded values
 *  4. Display the resolved JSON string returned by the bundle
 *
 * Verifies the JSC runtime, the bundle's render export, the props/env round-trip, and that
 * the renderer's compact-JSON output matches Voltra's wire format — all without involving
 * WidgetKit. WidgetKit hook-up arrives in Phase 3b.
 */
export default function IosClientRenderedSmokeScreen() {
  const router = useRouter()
  const [busy, setBusy] = useState(false)
  const [bundleSize, setBundleSize] = useState<number | null>(null)
  const [resolved, setResolved] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const runSmokeTest = async () => {
    if (Platform.OS !== 'ios') {
      Alert.alert('Not available', 'This smoke test is iOS-only for now.')
      return
    }
    setBusy(true)
    setResolved(null)
    setError(null)
    try {
      const url = `${METRO_BASE_URL}/voltra/widgets/${WIDGET_ID}.bundle?platform=ios&dev=true`
      const response = await fetch(url)
      if (!response.ok) {
        throw new Error(`Metro returned ${response.status}: ${await response.text()}`)
      }
      const source = await response.text()
      setBundleSize(source.length)

      await voltraWidgetEvalBundle(WIDGET_ID, source)

      // Track5DemoWidget ignores props (hot-reload marker is hardcoded inside the JSX,
      // env values come from the runtime); passing {} is enough to exercise the
      // bundle → eval → render round-trip.
      const props = {}
      const env = {
        date: Date.now(),
        widgetFamily: 'systemMedium',
        colorScheme: 'dark' as const,
        widgetRenderingMode: 'fullColor' as const,
        configuration: undefined,
        build: {
          isDev: true,
          metroUrl: METRO_BASE_URL,
          appVersion: '1.0.0',
          voltraVersion: '1.4.1',
        },
      }
      const result = await voltraWidgetRender(WIDGET_ID, JSON.stringify(props), JSON.stringify(env))
      setResolved(result)
    } catch (e) {
      const message = e instanceof Error ? e.message : String(e)
      setError(message)
      Alert.alert('Smoke test failed', message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <ScreenLayout
      title="Client-Rendered Widget Smoke Test"
      description="Phase 3a — verify the JSC runtime can fetch a Metro bundle, evaluate it, and invoke render(props, env) end-to-end. WidgetKit comes in Phase 3b."
    >
      <View style={styles.section}>
        <Button
          title={busy ? 'Running…' : `Smoke test ${WIDGET_ID}`}
          variant="primary"
          onPress={runSmokeTest}
          disabled={busy}
        />
        <Text style={styles.hint}>Make sure Metro is running on {METRO_BASE_URL}.</Text>
      </View>

      {bundleSize != null && (
        <View style={styles.section}>
          <Text style={styles.label}>Bundle fetched</Text>
          <Text style={styles.value}>{bundleSize.toLocaleString()} characters</Text>
        </View>
      )}

      {error && (
        <View style={styles.section}>
          <Text style={styles.label}>Error</Text>
          <Text style={[styles.value, styles.error]}>{error}</Text>
        </View>
      )}

      {resolved && (
        <View style={styles.section}>
          <Text style={styles.label}>Resolved JSON</Text>
          <ScrollView style={styles.preview} horizontal>
            <Text style={styles.preformatted}>{tryFormatJson(resolved)}</Text>
          </ScrollView>
        </View>
      )}

      <View style={styles.footer}>
        <Button title="Back" variant="ghost" onPress={() => router.back()} />
      </View>
    </ScreenLayout>
  )
}

function tryFormatJson(value: string): string {
  try {
    return JSON.stringify(JSON.parse(value), null, 2)
  } catch {
    return value
  }
}

const styles = StyleSheet.create({
  section: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#E2E8F0',
    marginBottom: 6,
  },
  value: {
    fontSize: 14,
    color: '#FFFFFF',
  },
  hint: {
    fontSize: 12,
    color: '#94A3B8',
    marginTop: 8,
  },
  error: {
    color: '#FCA5A5',
  },
  preview: {
    backgroundColor: 'rgba(0,0,0,0.4)',
    borderRadius: 8,
    padding: 12,
    maxHeight: 320,
  },
  preformatted: {
    color: '#E2E8F0',
    fontFamily: Platform.select({ ios: 'Menlo', default: 'monospace' }),
    fontSize: 11,
  },
  footer: {
    marginTop: 24,
    alignItems: 'center',
  },
})
