import { Link } from 'expo-router'
import React, { useState } from 'react'
import { Alert, Image, ScrollView, StyleSheet, Text, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { clearPreloadedImages, preloadImages, reloadLiveActivities, startVoltra, Voltra } from 'voltra'

import { Button } from '~/components/Button'
import { Card } from '~/components/Card'
import { TextInput } from '~/components/TextInput'

export default function ImagePreloadingScreen() {
  const insets = useSafeAreaInsets()
  const [url, setUrl] = useState(`https://picsum.photos/id/${Math.floor(Math.random() * 238)}/100/100`)
  const [key, setKey] = useState('test-image')
  const [isDownloading, setIsDownloading] = useState(false)
  const [isStartingActivity, setIsStartingActivity] = useState(false)
  const [downloadResult, setDownloadResult] = useState<{
    succeeded: string[]
    failed: { key: string; error: string }[]
  } | null>(null)

  const handleDownload = async () => {
    if (!url.trim() || !key.trim()) {
      Alert.alert('Error', 'Please enter both URL and key')
      return
    }

    setIsDownloading(true)
    setDownloadResult(null)

    try {
      const result = await preloadImages([
        {
          url: url.trim(),
          key: key.trim(),
        },
      ])

      setDownloadResult(result)
    } catch (error) {
      Alert.alert('Error', `Failed to download image: ${error}`)
    } finally {
      setIsDownloading(false)
    }
  }

  const handleStartActivity = async () => {
    if (!downloadResult?.succeeded.length) {
      Alert.alert('Error', 'Please download an image first')
      return
    }

    setIsStartingActivity(true)

    try {
      await startVoltra(
        {
          lockScreen: (
            <Voltra.VStack style={{ padding: 16 }}>
              <Voltra.Text style={{ fontSize: 18, fontWeight: 'bold', color: '#FFFFFF' }}>
                Image Preloading Test
              </Voltra.Text>
              <Voltra.Image
                source={{ assetName: downloadResult.succeeded[0] }}
                style={{ width: 80, height: 80, borderRadius: 8, marginTop: 8 }}
              />
              <Voltra.Text style={{ color: '#CBD5F5', marginTop: 8 }}>
                If you can see the image, preloading worked!
              </Voltra.Text>
            </Voltra.VStack>
          ),
        },
        {
          activityId: 'image-preload-test',
        }
      )
    } catch (error) {
      Alert.alert('Error', `Failed to start Live Activity: ${error}`)
    } finally {
      setIsStartingActivity(false)
    }
  }

  const handleReloadActivities = async () => {
    try {
      await reloadLiveActivities()
      Alert.alert('Success', 'Live Activities reloaded')
    } catch (error) {
      Alert.alert('Error', `Failed to reload Live Activities: ${error}`)
    }
  }

  const handleClearImages = async () => {
    try {
      await clearPreloadedImages([key.trim()])
      Alert.alert('Success', 'Preloaded images cleared')
      setDownloadResult(null)
    } catch (error) {
      Alert.alert('Error', `Failed to clear images: ${error}`)
    }
  }

  return (
    <ScrollView style={styles.container}>
      <View
        style={[
          styles.scrollView,
          {
            paddingTop: insets.top,
            paddingBottom: insets.bottom,
          },
        ]}
      >
        <Text style={styles.heading}>Image Preloading</Text>
        <Text style={styles.subheading}>
          Test image preloading functionality for Live Activities. Download images to App Group storage and verify they
          appear in Live Activities.
        </Text>

        <Card>
          <Card.Title>Download Image</Card.Title>
          <Card.Text>Enter a URL and key to download an image for use in Live Activities.</Card.Text>

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

            <Text style={[styles.inputLabel, { marginTop: 16 }]}>Asset Key</Text>
            <TextInput
              placeholder="my-image-key"
              value={key}
              onChangeText={setKey}
              autoCapitalize="none"
              autoCorrect={false}
            />
          </View>

          <View style={styles.buttonRow}>
            <Button
              title={isDownloading ? 'Downloading...' : 'Download Image'}
              variant="primary"
              onPress={handleDownload}
              disabled={isDownloading}
            />
            <Button title="Clear Images" variant="secondary" onPress={handleClearImages} />
          </View>

          {downloadResult && (
            <View style={styles.resultContainer}>
              <Text style={styles.resultTitle}>Download Result:</Text>
              {downloadResult.succeeded.length > 0 && (
                <Text style={styles.resultSuccess}>✓ Succeeded: {downloadResult.succeeded.join(', ')}</Text>
              )}
              {downloadResult.failed.length > 0 && (
                <Text style={styles.resultError}>✗ Failed: {downloadResult.failed.map((f) => f.key).join(', ')}</Text>
              )}
            </View>
          )}
        </Card>

        <Card>
          <Card.Title>Downloaded Image Preview</Card.Title>
          <Card.Text>Preview of the downloaded image in React Native UI.</Card.Text>

          <View style={styles.imagePreviewContainer}>
            {downloadResult?.succeeded.length ? (
              <Image source={{ uri: url.trim() }} style={styles.previewImage} resizeMode="cover" />
            ) : (
              <View style={styles.placeholderContainer}>
                <Text style={styles.placeholderText}>
                  {isDownloading ? 'Downloading...' : 'No image downloaded yet'}
                </Text>
              </View>
            )}
          </View>
        </Card>

        <Card>
          <Card.Title>Test Live Activity</Card.Title>
          <Card.Text>
            Start a Live Activity that uses the preloaded image. If preloading worked, you should see the image in the
            Live Activity.
          </Card.Text>

          <View style={styles.buttonRow}>
            <Button
              title={isStartingActivity ? 'Starting...' : 'Start Live Activity'}
              variant="primary"
              onPress={handleStartActivity}
              disabled={isStartingActivity || !downloadResult?.succeeded.length}
            />
            <Button title="Reload Activities" variant="ghost" onPress={handleReloadActivities} />
          </View>

          {!downloadResult?.succeeded.length && (
            <Text style={styles.hint}>Download an image first to enable Live Activity testing.</Text>
          )}
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
  resultContainer: {
    marginTop: 16,
    padding: 12,
    backgroundColor: '#1E293B',
    borderRadius: 8,
  },
  resultTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#E2E8F0',
    marginBottom: 8,
  },
  resultSuccess: {
    fontSize: 13,
    color: '#10B981',
    marginBottom: 4,
  },
  resultError: {
    fontSize: 13,
    color: '#EF4444',
  },
  hint: {
    marginTop: 12,
    fontSize: 13,
    color: '#64748B',
    fontStyle: 'italic',
  },
  footer: {
    marginTop: 24,
    alignItems: 'center',
  },
  imagePreviewContainer: {
    marginTop: 16,
    height: 120,
    backgroundColor: '#1E293B',
    borderRadius: 8,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  previewImage: {
    width: '100%',
    height: '100%',
  },
  placeholderContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
  },
  placeholderText: {
    color: '#64748B',
    fontSize: 14,
    textAlign: 'center',
  },
})
