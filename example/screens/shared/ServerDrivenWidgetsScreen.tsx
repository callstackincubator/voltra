import React, { useState } from 'react'
import { Alert, Platform, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native'
import { reloadAndroidWidgets, VoltraWidgetPreview as AndroidVoltraWidgetPreview } from 'voltra/android/client'
import {
  clearWidgetServerCredentials,
  reloadWidgets,
  setWidgetServerCredentials,
  VoltraWidgetPreview,
} from 'voltra/client'

import { Button } from '~/components/Button'
import { Card } from '~/components/Card'
import { AndroidDynamicWeatherWidget } from '~/widgets/android/AndroidDynamicWeatherWidget'
import { IosDynamicWeatherWidget } from '~/widgets/ios/IosDynamicWeatherWidget'

export default function ServerDrivenWidgetsScreen() {
  const [serverUrl, setServerUrl] = useState('http://localhost:3333')
  const [token, setToken] = useState('demo-token')
  const [credentialsSet, setCredentialsSet] = useState(false)
  const [isLoading, setIsLoading] = useState(false)

  const handleSetCredentials = async () => {
    setIsLoading(true)
    try {
      await setWidgetServerCredentials({
        token,
        headers: {
          'X-Widget-Source': 'voltra-example',
        },
      })
      setCredentialsSet(true)
      Alert.alert(
        'Success',
        'Widget server credentials saved securely.\n\nOn iOS: stored in Shared Keychain\nOn Android: encrypted via Tink in DataStore'
      )
    } catch (error) {
      Alert.alert('Error', `Failed to set credentials: ${error}`)
    } finally {
      setIsLoading(false)
    }
  }

  const handleClearCredentials = async () => {
    setIsLoading(true)
    try {
      await clearWidgetServerCredentials()
      setCredentialsSet(false)
      Alert.alert('Success', 'Widget server credentials cleared.')
    } catch (error) {
      Alert.alert('Error', `Failed to clear credentials: ${error}`)
    } finally {
      setIsLoading(false)
    }
  }

  const handleReloadWidgets = async () => {
    try {
      if (Platform.OS === 'android') {
        await reloadAndroidWidgets(['dynamic_weather'])
        Alert.alert('Success', 'Android widgets reloaded. WorkManager will fetch fresh content from the server.')
      } else {
        await reloadWidgets(['dynamic_weather'])
        Alert.alert('Success', 'Widget timelines reloaded. The widget will fetch fresh content from the server.')
      }
    } catch (error) {
      Alert.alert('Error', `Failed to reload: ${error}`)
    }
  }

  return (
    <View style={styles.container}>
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.content}>
        <Text style={styles.heading}>Server-Driven Widgets</Text>
        <Text style={styles.subheading}>
          Widgets can fetch content from a remote server without the user opening the app. This is configured via the{' '}
          <Text style={styles.code}>serverUpdate</Text> option in the plugin config.
        </Text>

        {/* How it works */}
        <Card>
          <Card.Title>How it works</Card.Title>
          <Card.Text>
            1. Configure <Text style={styles.code}>serverUpdate.url</Text> in your widget config{'\n\n'}
            2. Call <Text style={styles.code}>setWidgetServerCredentials()</Text> after user login{'\n\n'}
            3. iOS WidgetKit / Android WorkManager periodically fetches from your server URL{'\n\n'}
            4. Your server renders JSX → JSON using <Text style={styles.code}>createWidgetUpdateHandler()</Text>
            {'\n\n'}
            5. The widget updates automatically — no app launch needed!
          </Card.Text>
          {Platform.OS === 'android' ? (
            <View style={[styles.codeBlock, { backgroundColor: '#1a1a2e', marginTop: 8 }]}>
              <Text style={[styles.codeText, { color: '#fbbf24' }]}>
                ⚠️ Android emulator: use 10.0.2.2 instead of localhost to reach the host machine. Real devices need the
                host`s LAN IP.
              </Text>
            </View>
          ) : null}
        </Card>

        {/* Plugin config */}
        <Card>
          <Card.Title>Plugin Configuration</Card.Title>
          <Card.Text>
            In <Text style={styles.code}>app.json</Text>, add <Text style={styles.code}>serverUpdate</Text> to your
            widget:
          </Card.Text>
          <View style={styles.codeBlock}>
            <Text style={styles.codeText}>
              {Platform.OS === 'android'
                ? `// android.widgets in app.json
{
  "android": {
    "widgets": [{
      "id": "dynamic_weather",
      "serverUpdate": {
        "url": "${serverUrl}",
        "intervalMinutes": 15
      }
    }]
  }
}`
                : `// widgets in app.json (iOS)
{
  "widgets": [{
    "id": "dynamic_weather",
    "serverUpdate": {
      "url": "${serverUrl}",
      "intervalMinutes": 15
    }
  }]
}`}
            </Text>
          </View>
        </Card>

        {/* Credentials */}
        <Card>
          <Card.Title>Server Credentials</Card.Title>
          <Card.Text>
            Store auth tokens securely so the widget extension can authenticate with your server in the background.
          </Card.Text>

          <Text style={styles.label}>Server URL</Text>
          <TextInput
            style={styles.input}
            value={serverUrl}
            onChangeText={setServerUrl}
            placeholder="http://localhost:3333"
            placeholderTextColor="#64748B"
            autoCapitalize="none"
            autoCorrect={false}
          />

          <Text style={styles.label}>Auth Token</Text>
          <TextInput
            style={styles.input}
            value={token}
            onChangeText={setToken}
            placeholder="your-auth-token"
            placeholderTextColor="#64748B"
            autoCapitalize="none"
            autoCorrect={false}
          />

          <View style={styles.buttonRow}>
            <Button
              title={credentialsSet ? '✅ Credentials Set' : 'Set Credentials'}
              variant={credentialsSet ? 'secondary' : 'primary'}
              onPress={handleSetCredentials}
              disabled={isLoading || !token}
              style={styles.flex1}
            />
            <Button
              title="Clear"
              variant="ghost"
              onPress={handleClearCredentials}
              disabled={isLoading || !credentialsSet}
            />
          </View>
        </Card>

        {/* Actions */}
        <Card>
          <Card.Title>Widget Actions</Card.Title>
          <Card.Text>
            Reload widget timelines to trigger an immediate server fetch. Normally the widget fetches at the configured
            interval.
          </Card.Text>
          <View style={styles.buttonContainer}>
            <Button title="Reload Dynamic Weather Widgets" variant="primary" onPress={handleReloadWidgets} />
          </View>
        </Card>

        {/* Server setup */}
        <Card>
          <Card.Title>Running the Server</Card.Title>
          <Card.Text>Start the example widget server in a terminal:</Card.Text>
          <View style={styles.codeBlock}>
            <Text style={styles.codeText}>npx tsx example/server/widget-server.tsx</Text>
          </View>
          <Card.Text>
            {'\n'}The server renders weather widgets with rotating conditions. Each request returns a different weather
            state so you can see the widget update.{'\n\n'}
            iOS uses <Text style={styles.code}>Voltra.*</Text> components while Android uses{' '}
            <Text style={styles.code}>VoltraAndroid.*</Text> components. The server handles both via separate{' '}
            <Text style={styles.code}>render</Text> and <Text style={styles.code}>renderAndroid</Text> callbacks.
          </Card.Text>
        </Card>

        {/* Widget preview */}
        <Card>
          <Card.Title>Widget Preview</Card.Title>
          <Card.Text>
            This is the weather widget`s initial state. When <Text style={styles.code}>serverUpdate</Text> is
            configured, the widget extension will periodically replace this with fresh server-rendered content.
          </Card.Text>
          <View style={styles.previewContainer}>
            {Platform.OS === 'android' ? (
              <AndroidVoltraWidgetPreview family="mediumWide" style={styles.widgetPreview}>
                <AndroidDynamicWeatherWidget />
              </AndroidVoltraWidgetPreview>
            ) : (
              <VoltraWidgetPreview family="systemMedium" style={styles.widgetPreview}>
                <IosDynamicWeatherWidget />
              </VoltraWidgetPreview>
            )}
          </View>
        </Card>

        <View style={styles.bottomSpacer} />
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
    padding: 16,
    paddingBottom: 40,
  },
  heading: {
    fontSize: 28,
    fontWeight: '700',
    color: '#E2E8F0',
    marginBottom: 4,
  },
  subheading: {
    fontSize: 14,
    color: '#94A3B8',
    lineHeight: 20,
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
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: '#CBD5E1',
    marginTop: 14,
    marginBottom: 6,
  },
  input: {
    backgroundColor: '#1E293B',
    borderRadius: 10,
    padding: 12,
    color: '#E2E8F0',
    fontSize: 14,
    borderWidth: 1,
    borderColor: 'rgba(148, 163, 184, 0.15)',
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 14,
  },
  flex1: {
    flex: 1,
  },
  buttonContainer: {
    marginTop: 14,
  },
  previewContainer: {
    alignItems: 'center',
    marginTop: 14,
  },
  widgetPreview: {
    borderRadius: 16,
    overflow: 'hidden',
  },
  bottomSpacer: {
    height: 40,
  },
})
