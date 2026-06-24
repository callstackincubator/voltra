import { useRouter } from 'expo-router'
import React, { useCallback, useEffect, useState } from 'react'
import { Alert, Platform, StyleSheet, Text, TextInput, View } from 'react-native'
import {
  getActiveWidgets,
  requestPinAndroidWidget,
  setWidgetInstanceConfiguration,
  type WidgetInfo,
} from '@use-voltra/android-client'

import { Button } from '~/components/Button'
import { ScreenLayout } from '~/components/ScreenLayout'

const AVAILABLE_WIDGETS = [
  {
    id: 'voltra',
    name: 'Voltra Widget',
    description: 'Voltra logo widget',
    defaultPreviewWidth: 245,
    defaultPreviewHeight: 115,
  },
  {
    id: 'interactive_todos',
    name: 'Interactive Todos Widget',
    description: 'Testing interactive widgets with checkboxes, switches, and buttons',
    defaultPreviewWidth: 250,
    defaultPreviewHeight: 150,
  },
  {
    id: 'image_fallback',
    name: 'Image Fallback Widget',
    description: 'Test image fallback with backgroundColor from styles',
    defaultPreviewWidth: 250,
    defaultPreviewHeight: 150,
  },
  {
    id: 'AndroidClientDemoWidget',
    name: 'Client-Rendered Demo',
    description: 'On-device JSX render (Hermes) with live env',
    defaultPreviewWidth: 250,
    defaultPreviewHeight: 150,
  },
]

const CONFIGURABLE_WIDGET_ID = 'AndroidClientDemoWidget'

export default function AndroidWidgetPinScreen() {
  const router = useRouter()
  const [selectedWidgetId, setSelectedWidgetId] = useState<string>('voltra')
  const [previewWidth, setPreviewWidth] = useState<string>('250')
  const [previewHeight, setPreviewHeight] = useState<string>('150')
  const [isPinning, setIsPinning] = useState(false)
  const [configLabel, setConfigLabel] = useState<string>('')
  const [activeWidgets, setActiveWidgets] = useState<WidgetInfo[]>([])
  const [selectedWidgetInstanceId, setSelectedWidgetInstanceId] = useState<number | null>(null)

  const selectedWidget = AVAILABLE_WIDGETS.find((w) => w.id === selectedWidgetId) || AVAILABLE_WIDGETS[0]

  const resetPreviewDimensions = (widget = selectedWidget) => {
    // Use dimensions that match actual widget content variants for better previews
    if (widget.id === 'interactive_todos') {
      setPreviewWidth('250')
      setPreviewHeight('150')
    } else {
      setPreviewWidth(String(widget.defaultPreviewWidth))
      setPreviewHeight(String(widget.defaultPreviewHeight))
    }
  }

  const refreshActiveWidgets = useCallback(async () => {
    if (Platform.OS !== 'android') {
      return
    }

    try {
      const widgets = await getActiveWidgets()
      setActiveWidgets(widgets)
      setSelectedWidgetInstanceId((current) => {
        if (widgets.some((widget) => widget.widgetId === current && widget.name === CONFIGURABLE_WIDGET_ID)) {
          return current
        }

        return widgets.find((widget) => widget.name === CONFIGURABLE_WIDGET_ID)?.widgetId ?? null
      })
    } catch (error: any) {
      Alert.alert('Error', error?.message || String(error))
    }
  }, [])

  useEffect(() => {
    refreshActiveWidgets()
  }, [refreshActiveWidgets])

  const handleSetConfig = async () => {
    if (Platform.OS !== 'android') {
      return
    }

    if (selectedWidgetInstanceId == null) {
      Alert.alert('No widget selected', 'Pin the configurable demo widget first, then choose that instance.')
      return
    }

    const selectedWidget = activeWidgets.find(
      (widget) => widget.widgetId === selectedWidgetInstanceId && widget.name === CONFIGURABLE_WIDGET_ID
    )
    if (!selectedWidget) {
      Alert.alert('Unsupported widget', 'Only the client-rendered demo widget is configurable in this example.')
      return
    }

    try {
      await setWidgetInstanceConfiguration(selectedWidgetInstanceId, 'label', configLabel)
      Alert.alert(
        'Saved',
        `Set config "label" = "${configLabel}" for widget instance #${selectedWidgetInstanceId}. The widget re-renders.`
      )
      await refreshActiveWidgets()
    } catch (error: any) {
      Alert.alert('Error', error?.message || String(error))
    }
  }

  const handlePinWidget = async (usePreview: boolean) => {
    if (Platform.OS !== 'android') {
      Alert.alert('Not Available', 'Widget pinning is only available on Android devices.')
      return
    }

    setIsPinning(true)
    try {
      const options = usePreview
        ? {
            previewWidth: parseFloat(previewWidth) || selectedWidget.defaultPreviewWidth,
            previewHeight: parseFloat(previewHeight) || selectedWidget.defaultPreviewHeight,
          }
        : undefined

      const success = await requestPinAndroidWidget(selectedWidgetId, options)

      if (success) {
        Alert.alert(
          'Success',
          `Pin request sent for ${selectedWidget.name}! Check your home screen to complete the pinning.`
        )
        await refreshActiveWidgets()
      } else {
        Alert.alert(
          'Not Supported',
          'Widget pinning is not available on this device. This feature requires Android 8.0 (API level 26) or higher.'
        )
      }
    } catch (error: any) {
      const errorMessage = error?.message || String(error)
      Alert.alert('Error', `Failed to request widget pin: ${errorMessage}`)
      console.error('Widget pin error:', error)
    } finally {
      setIsPinning(false)
    }
  }

  return (
    <ScreenLayout
      title="Pin Widget to Home Screen"
      description="Select a widget and pin it to your home screen. Optionally set preview dimensions to show how the widget will look."
    >
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Widget</Text>
        {AVAILABLE_WIDGETS.map((widget) => (
          <View key={widget.id} style={styles.widgetOption}>
            <Button
              title={widget.name}
              variant={selectedWidgetId === widget.id ? 'primary' : 'secondary'}
              onPress={() => {
                setSelectedWidgetId(widget.id)
                resetPreviewDimensions(widget)
              }}
              style={styles.widgetButton}
            />
            <Text style={styles.widgetDescription}>{widget.description}</Text>
          </View>
        ))}
      </View>

      <View style={styles.section}>
        <View style={styles.sectionHeaderRow}>
          <Text style={styles.sectionTitle}>Configuration (Dynamic Widget)</Text>
          <Button title="Refresh" variant="ghost" onPress={refreshActiveWidgets} style={styles.smallButton} />
        </View>
        <Text style={styles.sectionDescription}>
          Configure one placed client-rendered widget instance at a time. This uses the new instance-level API, so two
          widgets of the same type can keep different values.
        </Text>
        <Text style={styles.sectionSubtitle}>Active widget instances</Text>
        {activeWidgets.some((widget) => widget.name === CONFIGURABLE_WIDGET_ID) ? (
          activeWidgets
            .filter((widget) => widget.name === CONFIGURABLE_WIDGET_ID)
            .map((widget) => (
              <View key={`${widget.widgetId}`} style={styles.widgetInstanceOption}>
                <Button
                  title={`${widget.name} #${widget.widgetId}`}
                  variant={selectedWidgetInstanceId === widget.widgetId ? 'primary' : 'secondary'}
                  onPress={() => setSelectedWidgetInstanceId(widget.widgetId)}
                  style={styles.widgetInstanceButton}
                />
                <Text style={styles.widgetInstanceDescription}>
                  {widget.width}x{widget.height}dp · {widget.providerClassName}
                </Text>
              </View>
            ))
        ) : (
          <Text style={styles.emptyState}>Pin the client-rendered demo widget first to configure an instance.</Text>
        )}
        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>env.configuration.label</Text>
          <TextInput
            style={styles.input}
            value={configLabel}
            onChangeText={setConfigLabel}
            placeholder="label value"
            placeholderTextColor="#64748B"
            autoCapitalize="none"
          />
        </View>
        <Button title="Set instance configuration" onPress={handleSetConfig} style={styles.resetButton} />
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Preview Dimensions (optional)</Text>
        <View style={styles.previewInputs}>
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Width (dp)</Text>
            <TextInput
              style={styles.input}
              value={previewWidth}
              onChangeText={setPreviewWidth}
              keyboardType="numeric"
              placeholder={String(selectedWidget.defaultPreviewWidth)}
            />
          </View>
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Height (dp)</Text>
            <TextInput
              style={styles.input}
              value={previewHeight}
              onChangeText={setPreviewHeight}
              keyboardType="numeric"
              placeholder={String(selectedWidget.defaultPreviewHeight)}
            />
          </View>
        </View>
        <Button title="Reset to Defaults" variant="ghost" onPress={resetPreviewDimensions} style={styles.resetButton} />
      </View>

      <View style={styles.section}>
        <View style={styles.buttonRow}>
          <Button
            title="Pin with Preview"
            variant="primary"
            onPress={() => handlePinWidget(true)}
            disabled={isPinning}
            style={styles.pinButton}
          />
          <Button
            title="Pin without Preview"
            variant="secondary"
            onPress={() => handlePinWidget(false)}
            disabled={isPinning}
            style={styles.pinButton}
          />
        </View>
        {isPinning && <Text style={styles.loadingText}>Requesting pin...</Text>}
      </View>

      <View style={styles.footer}>
        <Button title="Back to Android Home" variant="ghost" onPress={() => router.back()} />
      </View>
    </ScreenLayout>
  )
}

const styles = StyleSheet.create({
  section: {
    marginBottom: 24,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 12,
  },
  sectionDescription: {
    fontSize: 12,
    lineHeight: 18,
    color: '#94A3B8',
    marginBottom: 12,
  },
  sectionSubtitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#CBD5E1',
    marginBottom: 8,
  },
  widgetOption: {
    marginTop: 12,
  },
  widgetButton: {
    marginBottom: 4,
  },
  widgetDescription: {
    fontSize: 12,
    color: '#94A3B8',
    marginTop: 4,
    marginLeft: 4,
  },
  widgetInstanceOption: {
    marginTop: 12,
  },
  widgetInstanceButton: {
    marginBottom: 4,
  },
  widgetInstanceDescription: {
    fontSize: 12,
    color: '#94A3B8',
    marginTop: 4,
    marginLeft: 4,
  },
  previewInputs: {
    marginTop: 16,
    gap: 12,
  },
  inputGroup: {
    gap: 8,
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
  resetButton: {
    marginTop: 12,
  },
  buttonRow: {
    marginTop: 16,
    flexDirection: 'row',
    gap: 12,
  },
  pinButton: {
    flex: 1,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 12,
    color: '#94A3B8',
  },
  smallButton: {
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  emptyState: {
    color: '#94A3B8',
    fontSize: 12,
    marginBottom: 12,
  },
  footer: {
    marginTop: 24,
    alignItems: 'center',
  },
})
