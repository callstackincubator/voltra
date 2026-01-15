import { Link } from 'expo-router'
import React, { useState } from 'react'
import { Alert, ScrollView, StyleSheet, Text, View } from 'react-native'
import { Voltra } from 'voltra'
import { clearPreloadedImages, preloadImages, reloadLiveActivities, startLiveActivity } from 'voltra/client'

import { Button } from '~/components/Button'
import { Card } from '~/components/Card'
import { TextInput } from '~/components/TextInput'

function generateRandomKey(): string {
  return `asset-${Math.random().toString(36).substring(2, 15)}`
}

export default function ImagePreloadingScreen() {
  const [url, setUrl] = useState(`https://picsum.photos/id/${Math.floor(Math.random() * 120)}/100/100`)
  const [isProcessing, setIsProcessing] = useState(false)
  const [currentAssetKey, setCurrentAssetKey] = useState<string | null>(null)

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

  return (
    <ScrollView style={styles.container}>
      <View style={[styles.scrollView, styles.content]}>
        <Text style={styles.heading}>Image Preloading</Text>
        <Text style={styles.subheading}>
          Test image preloading functionality for Live Activities. Download images to App Group storage and verify they
          appear in Live Activities.
        </Text>

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

        <View style={styles.footer}>
          <Link href="/testing-grounds" asChild>
            <Button title="Back to Testing Grounds" variant="ghost" />
          </Link>
        </View>
      </View>
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0B0F1A',
  },
  scrollView: {
    flex: 1,
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
