import { useRouter } from 'expo-router'
import React, { useState } from 'react'
import { Alert, StyleSheet, Text, View } from 'react-native'
import { Voltra } from '@use-voltra/ios'
import {
  clearPreloadedImages,
  preloadImages,
  reloadLiveActivities,
  reloadWidgets,
  startLiveActivity,
  updateWidget,
  VoltraWidgetPreview,
} from '@use-voltra/ios-client'

import { Button } from '~/components/Button'
import { Card } from '~/components/Card'
import { ScreenLayout } from '~/components/ScreenLayout'
import { TextInput } from '~/components/TextInput'

function generateRandomKey(): string {
  return `asset-${Math.random().toString(36).substring(2, 15)}`
}

const SVG_OPTIONS = {
  green: {
    key: 'ios-widget-svg-test-green',
    color: '#34C759',
    title: 'Show Green SVG in Widget',
  },
  purple: {
    key: 'ios-widget-svg-test-purple',
    color: '#7C3AED',
    title: 'Show Purple SVG in Widget',
  },
} as const

type SvgOption = (typeof SVG_OPTIONS)[keyof typeof SVG_OPTIONS]

function createTestSvg(color: string): string {
  return `
<svg viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg">
  <rect width="48" height="48" rx="12" fill="${color}"/>
  <path d="M15 25.5l6.2 6.2L34 17" stroke="white" stroke-width="5" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
</svg>
`
}

function SvgWidgetContent({ assetKey, color }: { assetKey: string; color: string }) {
  return (
    <Voltra.LinearGradient
      colors={['#101828', '#1D2939']}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={{ flex: 1 }}
    >
      <Voltra.VStack style={{ flex: 1, padding: 16 }}>
        <Voltra.HStack alignment="center" spacing={10}>
          <Voltra.Image source={{ assetName: assetKey }} resizeMode="contain" style={{ width: 48, height: 48 }} />
          <Voltra.VStack spacing={3}>
            <Voltra.Text style={{ color: '#FFFFFF', fontSize: 16, fontWeight: '700' }}>SVG preload</Voltra.Text>
            <Voltra.Text style={{ color: '#D0D5DD', fontSize: 12 }}>{color}</Voltra.Text>
          </Voltra.VStack>
        </Voltra.HStack>

        <Voltra.Spacer />

        <Voltra.Text style={{ color: '#98A2B3', fontSize: 11 }}>Rendered from a preloaded SVG asset</Voltra.Text>
      </Voltra.VStack>
    </Voltra.LinearGradient>
  )
}

export default function ImagePreloadingScreen() {
  const router = useRouter()
  const [url, setUrl] = useState(`https://picsum.photos/id/${Math.floor(Math.random() * 120)}/100/100`)
  const [isProcessing, setIsProcessing] = useState(false)
  const [currentAssetKey, setCurrentAssetKey] = useState<string | null>(null)
  const [isSvgProcessing, setIsSvgProcessing] = useState(false)
  const [selectedSvgOption, setSelectedSvgOption] = useState<SvgOption | null>(null)

  const handleShowAndDownload = async () => {
    if (!url.trim()) {
      Alert.alert('Error', 'Please enter a URL')
      return
    }

    const assetKey = generateRandomKey()
    setIsProcessing(true)
    setCurrentAssetKey(assetKey)

    try {
      // Clear any existing images first
      if (currentAssetKey) {
        await clearPreloadedImages([currentAssetKey])
      }

      // Start live activity with the asset key
      await startLiveActivity(
        {
          lockScreen: (
            <Voltra.VStack style={{ padding: 16 }}>
              <Voltra.Text style={{ fontSize: 18, fontWeight: 'bold', color: '#FFFFFF' }}>
                Image Preloading Test
              </Voltra.Text>
              <Voltra.Image
                source={{ assetName: assetKey }}
                style={{ width: 80, height: 80, borderRadius: 8, marginTop: 8 }}
              />
              <Voltra.Text style={{ color: '#CBD5F5', marginTop: 8 }}>
                If you can see the image, preloading worked!
              </Voltra.Text>
            </Voltra.VStack>
          ),
        },
        {
          activityName: 'image-preload-test',
        }
      )

      // Wait a bit for the activity to start
      await new Promise((resolve) => setTimeout(resolve, 2000))

      // Preload the image
      await preloadImages([
        {
          url: url.trim(),
          key: assetKey,
        },
      ])

      // Reload live activities to show the preloaded image
      await reloadLiveActivities()
    } catch (error) {
      Alert.alert('Error', `Failed to process: ${error}`)
    } finally {
      setIsProcessing(false)
    }
  }

  const handleClearImages = async () => {
    if (!currentAssetKey) {
      Alert.alert('Error', 'No images to clear')
      return
    }

    try {
      await clearPreloadedImages([currentAssetKey])
      Alert.alert('Success', 'Preloaded images cleared')
      setCurrentAssetKey(null)
    } catch (error) {
      Alert.alert('Error', `Failed to clear images: ${error}`)
    }
  }

  const handleShowSvgWidget = async (option: SvgOption) => {
    setIsSvgProcessing(true)

    try {
      const result = await preloadImages([
        {
          key: option.key,
          svg: createTestSvg(option.color),
          width: 48,
          height: 48,
        },
      ])

      if (result.failed.length > 0) {
        Alert.alert('SVG preload failed', result.failed.map((failure) => failure.error).join('\n'))
        return
      }

      const variants = {
        systemSmall: <SvgWidgetContent assetKey={option.key} color={option.color} />,
        systemMedium: <SvgWidgetContent assetKey={option.key} color={option.color} />,
        systemLarge: <SvgWidgetContent assetKey={option.key} color={option.color} />,
      }

      await updateWidget('weather', variants)
      await reloadWidgets(['weather'])

      setSelectedSvgOption(option)
      Alert.alert('Success', 'SVG preloaded and the Weather widget was updated.')
    } catch (error) {
      Alert.alert('Error', `Failed to update SVG widget: ${error}`)
    } finally {
      setIsSvgProcessing(false)
    }
  }

  return (
    <ScreenLayout
      title="Image Preloading"
      description="Test image preloading functionality for Live Activities. Download images to App Group storage and verify they appear in Live Activities."
    >
      <Card>
        <Card.Title>Show and Download</Card.Title>
        <Card.Text>Enter a URL to start a Live Activity and preload the image automatically.</Card.Text>

        <View style={styles.inputContainer}>
          <Text style={styles.inputLabel}>Image URL</Text>
          <TextInput
            placeholder="https://example.com/image.jpg"
            value={url}
            onChangeText={setUrl}
            keyboardType="url"
            autoCapitalize="none"
            autoCorrect={false}
          />
        </View>

        <View style={styles.buttonRow}>
          <Button
            title={isProcessing ? 'Processing...' : 'Show and Download'}
            variant="primary"
            onPress={handleShowAndDownload}
            disabled={isProcessing}
          />
          <Button title="Clear Images" variant="secondary" onPress={handleClearImages} />
        </View>
      </Card>

      <Card>
        <Card.Title>SVG Widget Test</Card.Title>
        <Card.Text>
          Preload an inline SVG as a PNG asset and update the iOS Weather widget to render it with Voltra.Image.
        </Card.Text>

        <View style={styles.buttonRow}>
          <Button
            title={isSvgProcessing ? 'Updating...' : SVG_OPTIONS.green.title}
            variant={selectedSvgOption?.key === SVG_OPTIONS.green.key ? 'primary' : 'secondary'}
            style={selectedSvgOption?.key === SVG_OPTIONS.green.key ? styles.greenButtonSelected : undefined}
            onPress={() => handleShowSvgWidget(SVG_OPTIONS.green)}
            disabled={isSvgProcessing}
          />
          <Button
            title={SVG_OPTIONS.purple.title}
            variant={selectedSvgOption?.key === SVG_OPTIONS.purple.key ? 'primary' : 'secondary'}
            style={selectedSvgOption?.key === SVG_OPTIONS.purple.key ? styles.purpleButtonSelected : undefined}
            onPress={() => handleShowSvgWidget(SVG_OPTIONS.purple)}
            disabled={isSvgProcessing}
          />
        </View>

        {selectedSvgOption ? (
          <View style={styles.previewContainer}>
            <Text style={styles.inputLabel}>Preview</Text>
            <VoltraWidgetPreview key={selectedSvgOption.key} family="systemMedium" style={styles.widgetPreview}>
              <SvgWidgetContent assetKey={selectedSvgOption.key} color={selectedSvgOption.color} />
            </VoltraWidgetPreview>
          </View>
        ) : null}
      </Card>

      <View style={styles.footer}>
        <Button title="Back to Testing Grounds" variant="ghost" onPress={() => router.back()} />
      </View>
    </ScreenLayout>
  )
}

const styles = StyleSheet.create({
  inputContainer: {
    marginTop: 16,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#E2E8F0',
    marginBottom: 8,
  },
  buttonRow: {
    marginTop: 16,
    flexDirection: 'column',
    gap: 12,
  },
  greenButtonSelected: {
    backgroundColor: '#34C759',
  },
  purpleButtonSelected: {
    backgroundColor: '#7C3AED',
  },
  previewContainer: {
    marginTop: 16,
  },
  widgetPreview: {
    borderRadius: 16,
    overflow: 'hidden',
  },
  footer: {
    marginTop: 24,
    alignItems: 'center',
  },
})
