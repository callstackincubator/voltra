import { useRouter } from 'expo-router'
import React, { useState } from 'react'
import { Alert, Platform, ScrollView, StyleSheet, Text, View } from 'react-native'
import { requestPinAndroidWidget, updateAndroidWidget } from 'voltra/android/client'

import { Button } from '~/components/Button'
import { Card } from '~/components/Card'
import { AndroidImageFallbackWidget } from '~/widgets/AndroidImageFallbackWidget'

const WIDGET_ID = 'image_fallback'

type ExampleType = 'colors' | 'styled' | 'transparent' | 'custom' | 'mixed'

const EXAMPLES: Array<{ id: ExampleType; title: string; description: string }> = [
  {
    id: 'colors',
    title: 'Background Colors',
    description: 'Four missing images with different background colors (red, orange, green, blue)',
  },
  {
    id: 'styled',
    title: 'Combined Styles',
    description: 'Missing image with backgroundColor and borderRadius (Android 12+)',
  },
  {
    id: 'transparent',
    title: 'Transparent Fallback',
    description: 'Missing image with no backgroundColor - parent color shows through',
  },
  {
    id: 'custom',
    title: 'Custom Fallback',
    description: 'Missing image with custom fallback component (emoji and text)',
  },
  {
    id: 'mixed',
    title: 'Image Grid',
    description: 'Multiple missing images in a grid layout with different colors',
  },
]

export default function AndroidImageFallbackScreen() {
  const router = useRouter()
  const [selectedExample, setSelectedExample] = useState<ExampleType>('colors')
  const [isUpdating, setIsUpdating] = useState(false)
  const [isPinning, setIsPinning] = useState(false)

  const handlePinWidget = async () => {
    if (Platform.OS !== 'android') {
      Alert.alert('Not Available', 'Widget pinning is only available on Android devices.')
      return
    }

    setIsPinning(true)
    try {
      const success = await requestPinAndroidWidget(WIDGET_ID, {
        previewWidth: 250,
        previewHeight: 150,
      })

      if (success) {
        Alert.alert(
          'Success',
          'Pin request sent! Check your home screen to complete the pinning. Then use the buttons below to change examples.'
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

  const handleUpdateWidget = async (example: ExampleType) => {
    if (Platform.OS !== 'android') {
      Alert.alert('Not Available', 'Widget updates are only available on Android devices.')
      return
    }

    setSelectedExample(example)
    setIsUpdating(true)
    try {
      await updateAndroidWidget(WIDGET_ID, [
        {
          size: { width: 250, height: 150 },
          content: <AndroidImageFallbackWidget example={example} />,
        },
      ])
      Alert.alert('Success', `Widget updated to show: ${EXAMPLES.find((e) => e.id === example)?.title}`)
    } catch (error: any) {
      const errorMessage = error?.message || String(error)
      Alert.alert('Error', `Failed to update widget: ${errorMessage}`)
      console.error('Widget update error:', error)
    } finally {
      setIsUpdating(false)
    }
  }

  return (
    <View style={styles.container}>
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.content}>
        <Text style={styles.heading}>Image Fallback Widget (Android)</Text>
        <Text style={styles.subheading}>
          Test the new image fallback behavior on Android widgets. Pin the widget to your home screen, then use the
          buttons below to switch between different examples.
        </Text>

        <Card>
          <Card.Title>1. Pin Widget to Home Screen</Card.Title>
          <Card.Text>
            First, pin the widget to your home screen. You can then use the buttons below to update it with different
            examples.
          </Card.Text>
          <View style={styles.buttonContainer}>
            <Button
              title={isPinning ? 'Requesting Pin...' : 'Pin Widget to Home Screen'}
              variant="primary"
              onPress={handlePinWidget}
              disabled={isPinning}
            />
          </View>
        </Card>

        <Card>
          <Card.Title>2. Select Example to Display</Card.Title>
          <Card.Text>
            Choose an example to display in the widget. The widget will update immediately on your home screen.
          </Card.Text>

          {EXAMPLES.map((example) => (
            <View key={example.id} style={styles.exampleItem}>
              <Button
                title={example.title}
                variant={selectedExample === example.id ? 'primary' : 'secondary'}
                onPress={() => handleUpdateWidget(example.id)}
                disabled={isUpdating}
                style={styles.exampleButton}
              />
              <Text style={styles.exampleDescription}>{example.description}</Text>
            </View>
          ))}
        </Card>

        <View style={styles.infoBox}>
          <Text style={styles.infoTitle}>Migration Note</Text>
          <Text style={styles.infoText}>
            The <Text style={styles.code}>fallbackColor</Text> prop has been removed from the Image component.
          </Text>
          <Text style={[styles.infoText, { marginTop: 8 }]}>
            Before: <Text style={styles.code}>fallbackColor=&quot;#E0E0E0&quot;</Text>
          </Text>
          <Text style={styles.infoText}>
            After: <Text style={styles.code}>style={'{{ backgroundColor: "#E0E0E0" }}'}</Text>
          </Text>
          <Text style={[styles.infoText, { marginTop: 12 }]}>
            All style properties (backgroundColor, borderRadius, borders, etc.) now apply consistently to image
            fallbacks on both iOS and Android.
          </Text>
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
  buttonContainer: {
    marginTop: 16,
  },
  exampleItem: {
    marginTop: 12,
  },
  exampleButton: {
    marginBottom: 4,
  },
  exampleDescription: {
    fontSize: 12,
    color: '#94A3B8',
    marginTop: 4,
    marginLeft: 4,
  },
  infoBox: {
    backgroundColor: '#1E293B',
    borderRadius: 12,
    padding: 16,
    marginTop: 16,
    borderLeftWidth: 4,
    borderLeftColor: '#3B82F6',
  },
  infoTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 8,
  },
  infoText: {
    fontSize: 13,
    lineHeight: 18,
    color: '#CBD5E1',
  },
  code: {
    fontFamily: 'Courier',
    fontSize: 12,
    color: '#60A5FA',
    backgroundColor: '#0F172A',
    paddingHorizontal: 4,
    paddingVertical: 2,
    borderRadius: 4,
  },
  footer: {
    marginTop: 24,
    alignItems: 'center',
  },
})
