import { useRouter } from 'expo-router'
import React, { useState } from 'react'
import { Alert, StyleSheet, Text, View } from 'react-native'
import { VoltraAndroid } from '@use-voltra/android'
import {
  clearPreloadedImages,
  preloadImages,
  reloadWidgets,
  updateAndroidWidget,
  VoltraWidgetPreview,
} from '@use-voltra/android-client'

import { Button } from '~/components/Button'
import { ScreenLayout } from '~/components/ScreenLayout'
import { TextInput } from '~/components/TextInput'

function generateRandomUrl(): string {
  return `https://picsum.photos/id/${Math.floor(Math.random() * 200)}/300/200`
}

const ANDROID_SVG_OPTIONS = {
  green: {
    key: 'android-widget-svg-test-green',
    color: '#34C759',
    title: 'Show Green SVG in Widget',
  },
  purple: {
    key: 'android-widget-svg-test-purple',
    color: '#7C3AED',
    title: 'Show Purple SVG in Widget',
  },
} as const

type AndroidSvgOption = (typeof ANDROID_SVG_OPTIONS)[keyof typeof ANDROID_SVG_OPTIONS]

function createAndroidTestSvg(color: string): string {
  return `
<svg viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg">
  <rect width="48" height="48" rx="12" fill="${color}"/>
  <path d="M15 25.5l6.2 6.2L34 17" stroke="white" stroke-width="5" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
</svg>
`
}

function AndroidSvgWidgetContent({ assetKey, color }: { assetKey: string; color: string }) {
  return (
    <VoltraAndroid.Box
      style={{
        padding: 14,
        backgroundColor: '#1E293B',
        borderRadius: 16,
        flex: 1,
      }}
    >
      <VoltraAndroid.Column horizontalAlignment="center-horizontally" verticalAlignment="center-vertically">
        <VoltraAndroid.Image source={{ assetName: assetKey }} style={{ width: 42, height: 42 }} resizeMode="contain" />

        <VoltraAndroid.Spacer style={{ height: 10 }} />

        <VoltraAndroid.Text maxLines={1} style={{ fontSize: 16, fontWeight: 'bold', color: '#FFFFFF' }}>
          SVG preload
        </VoltraAndroid.Text>
        <VoltraAndroid.Text maxLines={1} style={{ fontSize: 12, color: '#CBD5E1' }}>
          {color}
        </VoltraAndroid.Text>

        <VoltraAndroid.Spacer style={{ height: 14 }} />

        <VoltraAndroid.Text maxLines={2} style={{ fontSize: 11, color: '#94A3B8', textAlign: 'center' }}>
          Preloaded SVG asset
        </VoltraAndroid.Text>
      </VoltraAndroid.Column>
    </VoltraAndroid.Box>
  )
}

export default function AndroidImagePreloadingScreen() {
  const router = useRouter()
  const [url, setUrl] = useState(generateRandomUrl())
  const [isProcessing, setIsProcessing] = useState(false)
  const [assetKey] = useState('android-preload-test')
  const [updateCount, setUpdateCount] = useState(0)
  const [isSvgProcessing, setIsSvgProcessing] = useState(false)
  const [selectedSvgOption, setSelectedSvgOption] = useState<AndroidSvgOption | null>(null)

  const handleUpdateAndPreload = async () => {
    if (!url.trim()) {
      Alert.alert('Error', 'Please enter a URL')
      return
    }

    setIsProcessing(true)

    try {
      // 1. Preload the image first
      console.log('Preloading image:', url)
      const result = await preloadImages([
        {
          url: url.trim(),
          key: assetKey,
        },
      ])

      if (result.failed.length > 0) {
        throw new Error(result.failed[0].error)
      }

      console.log('Preload successful, updating widget...')

      // 2. Update the widget to use the preloaded image
      await updateAndroidWidget('image_preloading', [
        {
          size: { width: 300, height: 200 },
          content: (
            <VoltraAndroid.Box
              style={{
                padding: 16,
                backgroundColor: '#1E293B',
                borderRadius: 16,
                flex: 1,
              }}
            >
              <VoltraAndroid.Column spacing={8} verticalAlignment="center-vertically">
                <VoltraAndroid.Text style={{ fontSize: 16, fontWeight: 'bold', color: '#FFFFFF' }}>
                  Preloaded Image Test
                </VoltraAndroid.Text>

                <VoltraAndroid.Image
                  source={{ assetName: assetKey }}
                  style={{ width: 240, height: 135, borderRadius: 8 }}
                  resizeMode="cover"
                />

                <VoltraAndroid.Row horizontalAlignment="end" style={{ width: '100%' }}>
                  <VoltraAndroid.Text style={{ fontSize: 10, color: '#94A3B8' }}>
                    Updates: {updateCount + 1}
                  </VoltraAndroid.Text>
                </VoltraAndroid.Row>
              </VoltraAndroid.Column>
            </VoltraAndroid.Box>
          ),
        },
      ])

      setUpdateCount((prev) => prev + 1)
      Alert.alert('Success', 'Image preloaded and widget updated!')
      setUrl(generateRandomUrl())
    } catch (error) {
      Alert.alert('Error', `Failed to process: ${error}`)
    } finally {
      setIsProcessing(false)
    }
  }

  const handleOverwriteAndReload = async () => {
    setIsProcessing(true)
    try {
      const nextUrl = generateRandomUrl()
      console.log('Overwriting image with same key but new URL:', nextUrl)

      const result = await preloadImages([
        {
          url: nextUrl,
          key: assetKey,
        },
      ])

      if (result.failed.length > 0) {
        throw new Error(result.failed[0].error)
      }

      console.log('Preload successful, reloading widgets...')

      // On Android, reloadWidgets (alias for reloadAndroidWidgets)
      // will force Glance to re-render, which will call extractImageProvider
      // and pick up the new URI from SharedPreferences.
      await reloadWidgets(['image_preloading'])

      Alert.alert('Success', 'Image overwritten and widget reloaded!')
    } catch (error) {
      Alert.alert('Error', `Failed to overwrite: ${error}`)
    } finally {
      setIsProcessing(false)
    }
  }

  const handleClearImages = async () => {
    try {
      await clearPreloadedImages([assetKey])
      Alert.alert('Success', 'Preloaded images cleared')
    } catch (error) {
      Alert.alert('Error', `Failed to clear images: ${error}`)
    }
  }

  const handleShowSvgWidget = async (option: AndroidSvgOption) => {
    setIsSvgProcessing(true)

    try {
      const result = await preloadImages([
        {
          key: option.key,
          svg: createAndroidTestSvg(option.color),
          width: 48,
          height: 48,
        },
      ])

      if (result.failed.length > 0) {
        throw new Error(result.failed[0].error)
      }

      await updateAndroidWidget('image_preloading', [
        {
          size: { width: 300, height: 200 },
          content: <AndroidSvgWidgetContent assetKey={option.key} color={option.color} />,
        },
      ])
      await reloadWidgets(['image_preloading'])

      setSelectedSvgOption(option)
      Alert.alert('Success', 'SVG preloaded and widget updated!')
    } catch (error) {
      Alert.alert('Error', `Failed to update SVG widget: ${error}`)
    } finally {
      setIsSvgProcessing(false)
    }
  }

  return (
    <ScreenLayout
      title="Android Image Preloading"
      description="Test preloading images for Android widgets. Enter a URL to preload an image and update the widget, or overwrite existing preloaded images."
    >
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
          title={isProcessing ? 'Processing...' : 'Setup Widget'}
          variant="primary"
          onPress={handleUpdateAndPreload}
          disabled={isProcessing}
        />
        <Button
          title={isProcessing ? 'Processing...' : 'Overwrite & Reload'}
          variant="primary"
          onPress={handleOverwriteAndReload}
          disabled={isProcessing}
        />
        <Button title="Clear Images" variant="secondary" onPress={handleClearImages} />
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>SVG Widget Test</Text>
        <Text style={styles.sectionText}>
          Preload an inline SVG as a PNG asset and update the Android image preloading widget to render it.
        </Text>

        <View style={styles.buttonRow}>
          <Button
            title={isSvgProcessing ? 'Updating...' : ANDROID_SVG_OPTIONS.green.title}
            variant={selectedSvgOption?.key === ANDROID_SVG_OPTIONS.green.key ? 'primary' : 'secondary'}
            style={selectedSvgOption?.key === ANDROID_SVG_OPTIONS.green.key ? styles.greenButtonSelected : undefined}
            onPress={() => handleShowSvgWidget(ANDROID_SVG_OPTIONS.green)}
            disabled={isSvgProcessing}
          />
          <Button
            title={ANDROID_SVG_OPTIONS.purple.title}
            variant={selectedSvgOption?.key === ANDROID_SVG_OPTIONS.purple.key ? 'primary' : 'secondary'}
            style={selectedSvgOption?.key === ANDROID_SVG_OPTIONS.purple.key ? styles.purpleButtonSelected : undefined}
            onPress={() => handleShowSvgWidget(ANDROID_SVG_OPTIONS.purple)}
            disabled={isSvgProcessing}
          />
        </View>

        {selectedSvgOption ? (
          <View style={styles.previewContainer}>
            <Text style={styles.inputLabel}>Preview</Text>
            <VoltraWidgetPreview key={selectedSvgOption.key} family="mediumWide" style={styles.widgetPreview}>
              <AndroidSvgWidgetContent assetKey={selectedSvgOption.key} color={selectedSvgOption.color} />
            </VoltraWidgetPreview>
          </View>
        ) : null}
      </View>

      <View style={styles.footer}>
        <Button title="Back to Android Home" variant="ghost" onPress={() => router.back()} />
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
  updateCount: {
    marginTop: 16,
    fontSize: 12,
    fontWeight: '600',
    color: '#8232FF',
  },
  buttonRow: {
    marginTop: 16,
    flexDirection: 'column',
    gap: 12,
  },
  section: {
    marginTop: 24,
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(148, 163, 184, 0.2)',
    backgroundColor: 'rgba(15, 23, 42, 0.8)',
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  sectionText: {
    marginTop: 8,
    fontSize: 14,
    lineHeight: 20,
    color: '#CBD5F5',
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
