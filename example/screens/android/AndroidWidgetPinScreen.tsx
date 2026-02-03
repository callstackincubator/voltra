import { useRouter } from 'expo-router'
import React, { useState } from 'react'
import { Alert, Platform, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native'
import { requestPinAndroidWidget } from 'voltra/android/client'

import { Button } from '~/components/Button'

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
]

export default function AndroidWidgetPinScreen() {
  const router = useRouter()
  const [selectedWidgetId, setSelectedWidgetId] = useState<string>('voltra')
  const [previewWidth, setPreviewWidth] = useState<string>('250')
  const [previewHeight, setPreviewHeight] = useState<string>('150')
  const [isPinning, setIsPinning] = useState(false)

  const selectedWidget = AVAILABLE_WIDGETS.find((w) => w.id === selectedWidgetId) || AVAILABLE_WIDGETS[0]

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

  const resetPreviewDimensions = () => {
    // Use dimensions that match actual widget content variants for better previews
    if (selectedWidget.id === 'interactive_todos') {
      setPreviewWidth('250')
      setPreviewHeight('150')
    } else {
      setPreviewWidth(String(selectedWidget.defaultPreviewWidth))
      setPreviewHeight(String(selectedWidget.defaultPreviewHeight))
    }
  }

  return (
    <View style={styles.container}>
      <ScrollView style={[styles.scrollView]} contentContainerStyle={styles.content}>
        <Text style={styles.heading}>Pin Widget to Home Screen</Text>
        <Text style={styles.subheading}>
          Select a widget and pin it to your home screen. Optionally set preview dimensions to show how the widget will
          look.
        </Text>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Widget</Text>
          {AVAILABLE_WIDGETS.map((widget) => (
            <View key={widget.id} style={styles.widgetOption}>
              <Button
                title={widget.name}
                variant={selectedWidgetId === widget.id ? 'primary' : 'secondary'}
                onPress={() => {
                  setSelectedWidgetId(widget.id)
                  resetPreviewDimensions()
                }}
                style={styles.widgetButton}
              />
              <Text style={styles.widgetDescription}>{widget.description}</Text>
            </View>
          ))}
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
          <Button
            title="Reset to Defaults"
            variant="ghost"
            onPress={resetPreviewDimensions}
            style={styles.resetButton}
          />
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
          <Button title="Back to Android Home" variant="ghost" onPress={() => router.push('/android-widgets')} />
        </View>
      </ScrollView>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    paddingHorizontal: 20,
    paddingVertical: 24,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 12,
  },
  heading: {
    fontSize: 24,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  subheading: {
    fontSize: 14,
    lineHeight: 20,
    color: '#CBD5F5',
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
    color: '#8232FF',
    textAlign: 'center',
  },
  noteText: {
    marginTop: 8,
    fontSize: 11,
    color: '#94A3B8',
    fontStyle: 'italic',
  },
  footer: {
    marginTop: 24,
    alignItems: 'center',
  },
})
