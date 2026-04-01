import { useRouter } from 'expo-router'
import React, { useState } from 'react'
import { Alert, Platform, ScrollView, StyleSheet, Text, View } from 'react-native'
import {
  reloadAndroidWidgets,
  requestPinAndroidWidget,
  setWidgetServerCredentials,
  updateAndroidWidget,
  VoltraWidgetPreview,
} from 'voltra/android/client'

import { Button } from '~/components/Button'
import { Card } from '~/components/Card'
import {
  AndroidMaterialColorsWidget,
  type AndroidMaterialColorsRenderSource,
} from '~/widgets/android/AndroidMaterialColorsWidget'

const WIDGET_ID = 'material_colors'
const DEMO_TOKEN = 'demo-token'

const formatRenderTime = () =>
  new Date().toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  })

export default function AndroidMaterialColorsScreen() {
  const router = useRouter()
  const [isPinning, setIsPinning] = useState(false)
  const [isRenderingClient, setIsRenderingClient] = useState(false)
  const [isRenderingServer, setIsRenderingServer] = useState(false)
  const [previewSource, setPreviewSource] = useState<AndroidMaterialColorsRenderSource>('initial')
  const [previewTimestamp, setPreviewTimestamp] = useState('waiting for render')

  const handlePinWidget = async () => {
    if (Platform.OS !== 'android') {
      Alert.alert('Not Available', 'This widget demo is only available on Android devices.')
      return
    }

    setIsPinning(true)
    try {
      const success = await requestPinAndroidWidget(WIDGET_ID, {
        previewWidth: 220,
        previewHeight: 220,
      })

      if (success) {
        Alert.alert('Pin requested', 'Add the widget on your home screen, then use the render buttons below.')
      } else {
        Alert.alert('Not supported', 'Widget pinning is not available on this device.')
      }
    } catch (error: any) {
      const message = error?.message || String(error)
      Alert.alert('Error', `Failed to pin widget: ${message}`)
    } finally {
      setIsPinning(false)
    }
  }

  const handleRenderOnClient = async () => {
    if (Platform.OS !== 'android') {
      Alert.alert('Not Available', 'Client-side widget rendering is only available on Android devices.')
      return
    }

    setIsRenderingClient(true)
    try {
      const renderedAt = formatRenderTime()

      await updateAndroidWidget(WIDGET_ID, [
        {
          size: { width: 200, height: 200 },
          content: <AndroidMaterialColorsWidget source="client" renderedAt={renderedAt} />,
        },
        {
          size: { width: 300, height: 200 },
          content: <AndroidMaterialColorsWidget source="client" renderedAt={renderedAt} />,
        },
      ])

      setPreviewSource('client')
      setPreviewTimestamp(renderedAt)
      Alert.alert(
        'Client render complete',
        'The widget JSON was rendered inside the app and pushed straight to Android.'
      )
    } catch (error: any) {
      const message = error?.message || String(error)
      Alert.alert('Error', `Failed to render on client: ${message}`)
    } finally {
      setIsRenderingClient(false)
    }
  }

  const handleRenderOnServer = async () => {
    if (Platform.OS !== 'android') {
      Alert.alert('Not Available', 'Server-side widget rendering is only available on Android devices.')
      return
    }

    setIsRenderingServer(true)
    try {
      await setWidgetServerCredentials({
        token: DEMO_TOKEN,
        headers: {
          'X-Widget-Source': 'voltra-example',
        },
      })

      await reloadAndroidWidgets([WIDGET_ID])

      setPreviewSource('server')
      setPreviewTimestamp('server timestamp')
      Alert.alert(
        'Server render requested',
        'The widget will fetch fresh JSON from the example server. Make sure `npm run widget:server --workspace voltra-example` is running on your host machine.'
      )
    } catch (error: any) {
      const message = error?.message || String(error)
      Alert.alert('Error', `Failed to render on server: ${message}`)
    } finally {
      setIsRenderingServer(false)
    }
  }

  return (
    <View style={styles.container}>
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.content}>
        <Text style={styles.heading}>Material Colors Widget</Text>
        <Text style={styles.subheading}>
          Test the same Android widget through both render paths. It uses Android semantic color tokens, so both
          client-side and server-side rendering resolve native Material You colors directly inside Glance.
        </Text>

        <Card>
          <Card.Title>1. Pin the Widget</Card.Title>
          <Card.Text>
            Add the widget to your home screen once, then switch between client-side and server-side renders.
          </Card.Text>
          <View style={styles.buttonContainer}>
            <Button
              title={isPinning ? 'Requesting pin...' : 'Pin widget to home screen'}
              variant="primary"
              onPress={handlePinWidget}
              disabled={isPinning}
            />
          </View>
        </Card>

        <Card>
          <Card.Title>2. Choose the Render Path</Card.Title>
          <Card.Text>
            Both buttons target the same <Text style={styles.code}>{WIDGET_ID}</Text> widget. Use them to compare how
            Material dynamic colors flow through the client and server pipelines.
          </Card.Text>
          <View style={styles.actionsRow}>
            <Button
              title={isRenderingClient ? 'Rendering on client...' : 'Render on client'}
              variant="primary"
              onPress={handleRenderOnClient}
              disabled={isRenderingClient || isRenderingServer}
              style={styles.actionButton}
            />
            <Button
              title={isRenderingServer ? 'Rendering on server...' : 'Render on server'}
              variant="secondary"
              onPress={handleRenderOnServer}
              disabled={isRenderingClient || isRenderingServer}
              style={styles.actionButton}
            />
          </View>
        </Card>

        <Card>
          <Card.Title>Preview</Card.Title>
          <Card.Text>
            This in-app preview mirrors the widget design. The home screen widget is the real test, but this makes it
            easier to see which render path you triggered last.
          </Card.Text>
          <View style={styles.previewContainer}>
            <VoltraWidgetPreview family="mediumSquare" style={styles.previewFrame}>
              <AndroidMaterialColorsWidget source={previewSource} renderedAt={previewTimestamp} />
            </VoltraWidgetPreview>
          </View>
        </Card>

        <Card>
          <Card.Title>Server Setup</Card.Title>
          <Card.Text>Run the example widget server before using the server render button:</Card.Text>
          <View style={styles.codeBlock}>
            <Text style={styles.codeText}>npm run widget:server --workspace voltra-example</Text>
          </View>
          <Card.Text>
            Android emulators use <Text style={styles.code}>10.0.2.2</Text> in the widget config, so the built-in
            server-driven refresh hits your host machine automatically.
          </Card.Text>
        </Card>

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
  actionsRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 16,
  },
  actionButton: {
    flex: 1,
  },
  previewContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    marginTop: 8,
    backgroundColor: '#0F172A',
    borderRadius: 12,
  },
  previewFrame: {
    borderRadius: 28,
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
  codeBlock: {
    backgroundColor: '#0F172A',
    borderRadius: 12,
    padding: 16,
    marginTop: 12,
  },
  codeText: {
    color: '#E2E8F0',
    fontFamily: 'Courier',
    fontSize: 12,
  },
  footer: {
    marginTop: 24,
    alignItems: 'center',
  },
})
