import { useRouter } from 'expo-router'
import React, { useState } from 'react'
import { Alert, ScrollView, StyleSheet, Text, View } from 'react-native'
import { VoltraAndroid } from 'voltra'
import { clearPreloadedImages, preloadImages, reloadWidgets, updateAndroidWidget } from 'voltra/android/client'

import { Button } from '~/components/Button'
import { TextInput } from '~/components/TextInput'

function generateRandomUrl(): string {
  return `https://picsum.photos/id/${Math.floor(Math.random() * 200)}/300/200`
}

export default function AndroidImagePreloadingScreen() {
  const router = useRouter()
  const [url, setUrl] = useState(generateRandomUrl())
  const [isProcessing, setIsProcessing] = useState(false)
  const [assetKey] = useState('android-preload-test')
  const [updateCount, setUpdateCount] = useState(0)

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

  return (
    <View style={styles.container}>
      <ScrollView style={[styles.scrollView]} contentContainerStyle={styles.content}>
        <Text style={styles.heading}>Android Image Preloading</Text>
        <Text style={styles.subheading}>
          Test preloading images for Android widgets. Enter a URL to preload an image and update the widget, or
          overwrite existing preloaded images.
        </Text>

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
    backgroundColor: '#0B0F1A',
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
  footer: {
    marginTop: 24,
    alignItems: 'center',
  },
})
