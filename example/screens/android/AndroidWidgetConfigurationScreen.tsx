import { useRouter } from 'expo-router'
import React, { useCallback, useEffect, useState } from 'react'
import { Platform, StyleSheet, Text, TextInput, View } from 'react-native'
import {
  clearWidgetInstanceConfiguration,
  getActiveWidgets,
  getWidgetConfiguration,
  getWidgetInstanceConfiguration,
  setWidgetConfiguration,
  setWidgetInstanceConfiguration,
  type WidgetInfo,
} from '@use-voltra/android-client'

import { Button } from '~/components/Button'
import { ScreenLayout } from '~/components/ScreenLayout'

const DYNAMIC_WIDGET_ID = 'AndroidClientDemoWidget'

/** The keys the demo widget declares as `appIntent.parameters` in app.json. */
const CONFIG_KEYS = ['label', 'subtitle'] as const

const emptyDraft = () => Object.fromEntries(CONFIG_KEYS.map((key) => [key, ''])) as Record<string, string>

export default function AndroidWidgetConfigurationScreen() {
  const router = useRouter()
  const [instances, setInstances] = useState<WidgetInfo[]>([])
  const [selectedId, setSelectedId] = useState<number | null>(null)
  const [draft, setDraft] = useState<Record<string, string>>(emptyDraft)
  const [merged, setMerged] = useState<Record<string, string> | null>(null)
  const [typeLabel, setTypeLabel] = useState('')
  const [status, setStatus] = useState<string | null>(null)

  const isAndroid = Platform.OS === 'android'
  const dynamicInstances = instances.filter((widget) => widget.widgetType === DYNAMIC_WIDGET_ID)

  // Inline status rather than Alert: you want to watch the tile change on the home screen without
  // dismissing a dialog first.
  const run = useCallback(async (label: string, action: () => Promise<string>) => {
    try {
      setStatus(`${label}…`)
      setStatus(await action())
    } catch (error: any) {
      setStatus(`✗ ${label} failed — ${error?.message || String(error)}`)
    }
  }, [])

  const refresh = useCallback(async () => {
    if (!isAndroid) {
      return
    }

    const widgets = await getActiveWidgets()
    setInstances(widgets)
    setSelectedId((current) => {
      const stillPlaced = widgets.some(
        (widget) => widget.appWidgetId === current && widget.widgetType === DYNAMIC_WIDGET_ID
      )
      return stillPlaced ? current : widgets.find((w) => w.widgetType === DYNAMIC_WIDGET_ID)?.appWidgetId ?? null
    })
  }, [isAndroid])

  useEffect(() => {
    refresh().catch((error: any) => setStatus(`✗ ${error?.message || String(error)}`))
  }, [refresh])

  // Load what the selected instance actually reads, so the inputs start from stored values rather
  // than blank. This is the full merge — defaults, widget-type, then instance.
  useEffect(() => {
    if (!isAndroid || selectedId == null) {
      setMerged(null)
      return
    }

    let cancelled = false
    getWidgetInstanceConfiguration(selectedId)
      .then((values) => {
        if (cancelled) {
          return
        }
        setMerged(values)
        setDraft(Object.fromEntries(CONFIG_KEYS.map((key) => [key, values[key] ?? ''])))
      })
      .catch((error: any) => {
        if (!cancelled) {
          setStatus(`✗ ${error?.message || String(error)}`)
        }
      })

    return () => {
      cancelled = true
    }
  }, [isAndroid, selectedId])

  const reloadMerged = async (appWidgetId: number) => {
    const values = await getWidgetInstanceConfiguration(appWidgetId)
    setMerged(values)
    return values
  }

  const handleSave = () =>
    selectedId != null &&
    run('Save instance configuration', async () => {
      // Every key in one call: one write, one re-render. The widget's `time:` row should advance
      // exactly once.
      await setWidgetInstanceConfiguration(selectedId, draft)
      await reloadMerged(selectedId)
      return `✓ Saved ${CONFIG_KEYS.length} keys to instance #${selectedId} in one write`
    })

  const handleReset = () =>
    selectedId != null &&
    run('Reset instance configuration', async () => {
      await clearWidgetInstanceConfiguration(selectedId)
      const values = await reloadMerged(selectedId)
      setDraft(Object.fromEntries(CONFIG_KEYS.map((key) => [key, values[key] ?? ''])))
      return `✓ Instance #${selectedId} handed back to widget-type and default values`
    })

  const handleSetTypeValue = () =>
    run('Set widget-type value', async () => {
      await setWidgetConfiguration(DYNAMIC_WIDGET_ID, 'label', typeLabel)
      const values = await getWidgetConfiguration(DYNAMIC_WIDGET_ID)
      if (selectedId != null) {
        await reloadMerged(selectedId)
      }
      return `✓ Widget-type layer now reads ${JSON.stringify(values)} — instances with their own label keep it`
    })

  // Configuration is only supported for Dynamic Widgets, and only for this app's widgets. Both are
  // rejected natively rather than silently doing nothing.
  const handleRejectionCheck = () => {
    const serverWidget = instances.find((widget) => widget.widgetType !== DYNAMIC_WIDGET_ID)
    if (!serverWidget) {
      setStatus('Pin a server-rendered widget (e.g. Voltra Widget) first to run this check.')
      return
    }

    return run('Rejection check', async () => {
      try {
        await setWidgetInstanceConfiguration(serverWidget.appWidgetId, { label: 'should be rejected' })
      } catch (error: any) {
        return `✓ Rejected as expected — ${error?.message || String(error)}`
      }
      return `✗ Configuring server-rendered #${serverWidget.appWidgetId} should have been rejected, but succeeded`
    })
  }

  return (
    <ScreenLayout
      title="Widget Configuration"
      description="Configure a placed Dynamic Widget. Instance values are scoped to one placement, widget-type values apply to every placement that has none of its own."
    >
      <View style={styles.section}>
        <View style={styles.headerRow}>
          <Text style={styles.sectionTitle}>Placed instances</Text>
          <Button title="Refresh" variant="ghost" onPress={() => refresh()} style={styles.smallButton} />
        </View>
        {dynamicInstances.length > 0 ? (
          dynamicInstances.map((widget) => (
            <Button
              key={widget.appWidgetId}
              title={`#${widget.appWidgetId} · ${widget.width}×${widget.height}dp`}
              variant={selectedId === widget.appWidgetId ? 'primary' : 'secondary'}
              onPress={() => setSelectedId(widget.appWidgetId)}
              style={styles.instanceButton}
            />
          ))
        ) : (
          <Text style={styles.hint}>
            No {DYNAMIC_WIDGET_ID} placed yet. Add it from the launcher&apos;s widget picker, then Refresh.
          </Text>
        )}
        <Text style={styles.hint}>
          Ids come from getActiveWidgets. An id with no matching tile on the home screen is an allocated-but-unplaced
          pin request — writing to it stores values nothing displays.
        </Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Instance values{selectedId != null ? ` · #${selectedId}` : ''}</Text>
        {CONFIG_KEYS.map((key) => (
          <View key={key} style={styles.inputGroup}>
            <Text style={styles.inputLabel}>env.configuration.{key}</Text>
            <TextInput
              style={styles.input}
              value={draft[key]}
              onChangeText={(value) => setDraft((current) => ({ ...current, [key]: value }))}
              placeholder={`${key} value`}
              placeholderTextColor="#64748B"
              autoCapitalize="none"
              editable={selectedId != null}
            />
          </View>
        ))}
        <View style={styles.buttonRow}>
          <Button title="Save" onPress={handleSave} disabled={selectedId == null} style={styles.flexButton} />
          <Button
            title="Reset to defaults"
            variant="ghost"
            onPress={handleReset}
            disabled={selectedId == null}
            style={styles.flexButton}
          />
        </View>
        {merged && <Text style={styles.readback}>env.configuration = {JSON.stringify(merged, null, 2)}</Text>}
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Widget-type value</Text>
        <Text style={styles.hint}>
          Shared by every placement without an instance value of its own. Instances configured above keep showing theirs
          — instance values shadow this layer.
        </Text>
        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>label (all instances)</Text>
          <TextInput
            style={styles.input}
            value={typeLabel}
            onChangeText={setTypeLabel}
            placeholder="shared label value"
            placeholderTextColor="#64748B"
            autoCapitalize="none"
          />
        </View>
        <View style={styles.buttonRow}>
          <Button title="Set for all" variant="secondary" onPress={handleSetTypeValue} style={styles.flexButton} />
          <Button title="Rejection check" variant="ghost" onPress={handleRejectionCheck} style={styles.flexButton} />
        </View>
      </View>

      {status && <Text style={styles.status}>{status}</Text>}

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
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    marginBottom: 4,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 12,
  },
  hint: {
    fontSize: 12,
    lineHeight: 18,
    color: '#94A3B8',
    marginTop: 8,
  },
  instanceButton: {
    marginTop: 8,
  },
  inputGroup: {
    gap: 8,
    marginTop: 12,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#E2E8F0',
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
  buttonRow: {
    marginTop: 16,
    flexDirection: 'row',
    gap: 12,
  },
  flexButton: {
    flex: 1,
  },
  smallButton: {
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  readback: {
    marginTop: 16,
    fontFamily: Platform.select({ android: 'monospace', default: 'Menlo' }),
    fontSize: 12,
    lineHeight: 18,
    color: '#CBD5E1',
  },
  status: {
    fontSize: 13,
    lineHeight: 20,
    color: '#E2E8F0',
    marginBottom: 24,
  },
  footer: {
    marginTop: 8,
    alignItems: 'center',
  },
})
