import React from 'react'
import { Alert, Platform, StyleSheet, Text, View } from 'react-native'
import { reloadWidgets as reloadWidgetsAndroid } from '@use-voltra/android-client'
import { reloadWidgets } from '@use-voltra/ios-client'

import { Button } from '~/components/Button'
import { Card } from '~/components/Card'
import { ScreenLayout } from '~/components/ScreenLayout'

export default function ServerDrivenWidgetsScreen() {
  const handleReloadWidgets = async () => {
    try {
      if (Platform.OS === 'android') {
        await reloadWidgetsAndroid(['portfolio'])
        Alert.alert('Success', 'Android widgets reloaded. WorkManager will fetch fresh content from the server.')
      } else {
        await reloadWidgets(['portfolio'])
        Alert.alert('Success', 'Widget timelines reloaded. The widget will fetch fresh content from the server.')
      }
    } catch (error) {
      Alert.alert('Error', `Failed to reload: ${error}`)
    }
  }

  return (
    <ScreenLayout title="Server-Driven Widgets" contentContainerStyle={styles.content}>
      <Text style={styles.description}>
        Widgets can fetch content from a remote server without the user opening the app. This example sets the
        `demo-token` credential on app startup, so there is no editable credentials form here.
      </Text>

      <Card>
        <Card.Title>Running the Server</Card.Title>
        <Card.Text>Start the example widget server in a terminal:</Card.Text>
        <View style={styles.codeBlock}>
          <Text style={styles.codeText}>npx tsx example/server/widget-server.tsx</Text>
        </View>
        <Card.Text>
          {`\n`}The server renders portfolio widgets with randomized chart data. Each request returns different
          portfolio performance data so you can see the widget update.{`\n\n`}
          iOS uses <Text style={styles.code}>Voltra.*</Text> components while Android uses{' '}
          <Text style={styles.code}>VoltraAndroid.*</Text> components. The server handles both via separate{' '}
          <Text style={styles.code}>render</Text> and <Text style={styles.code}>renderAndroid</Text> callbacks.
        </Card.Text>
        {Platform.OS === 'android' ? (
          <View style={styles.noteBlock}>
            <Text style={styles.noteText}>
              Android emulators should use <Text style={styles.code}>10.0.2.2</Text>. Real devices need your host
              machine`s LAN IP.
            </Text>
          </View>
        ) : null}
      </Card>

      <Card>
        <Card.Title>Widget Actions</Card.Title>
        <Card.Text>
          Reload widget timelines to trigger an immediate server fetch. Normally the widget fetches at the configured
          interval.
        </Card.Text>
        <View style={styles.buttonContainer}>
          <Button title="Reload Portfolio Widgets" variant="primary" onPress={handleReloadWidgets} />
        </View>
      </Card>
    </ScreenLayout>
  )
}

const styles = StyleSheet.create({
  content: {
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  description: {
    fontSize: 14,
    color: '#94A3B8',
    lineHeight: 20,
    marginBottom: 16,
  },
  code: {
    fontFamily: 'Courier',
    fontSize: 12,
    color: '#A78BFA',
    backgroundColor: 'rgba(130, 50, 255, 0.15)',
    paddingHorizontal: 4,
    borderRadius: 4,
  },
  codeBlock: {
    backgroundColor: '#1E293B',
    borderRadius: 12,
    padding: 14,
    marginTop: 12,
  },
  codeText: {
    fontFamily: 'Courier',
    fontSize: 12,
    color: '#A78BFA',
    lineHeight: 18,
  },
  noteBlock: {
    backgroundColor: '#1a1a2e',
    borderRadius: 10,
    padding: 12,
    marginTop: 14,
  },
  noteText: {
    color: '#FBBF24',
    fontSize: 12,
    lineHeight: 18,
  },
  buttonContainer: {
    marginTop: 14,
  },
})
