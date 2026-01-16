import { useRouter } from 'expo-router'
import React, { useState } from 'react'
import { Alert, ScrollView, StyleSheet, Text, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { VoltraAndroid } from 'voltra'
import {
  unstable_clearAllAndroidWidgets,
  unstable_clearAndroidWidget,
  unstable_reloadAndroidWidgets,
  unstable_updateAndroidWidget,
} from 'voltra/android'

import { Button } from '~/components/Button'
import { Card } from '~/components/Card'

export default function AndroidWidgetsTestingScreen() {
  const insets = useSafeAreaInsets()
  const router = useRouter()
  const [updateCount, setUpdateCount] = useState(0)

  const handleUpdateBasicWidget = async () => {
    try {
      await unstable_updateAndroidWidget('weather', [
        // LARGE (4x2 or 4x3 cells, ~300x200dp) - Full featured horizontal layout
        {
          size: { width: 300, height: 200 },
          content: (
            <VoltraAndroid.Row
              style={{
                padding: 32,
                backgroundColor: '#1E1B4B',
                borderRadius: 24,
                fillMaxWidth: true,
                fillMaxHeight: true,
              }}
              spacing={6}
              horizontalArrangement="Center"
            >
              <VoltraAndroid.Column spacing={6} verticalArrangement="Center">
                <VoltraAndroid.Text style={{ fontSize: 64, fontWeight: 'bold', color: '#6366F1' }}>
                  ⚡
                </VoltraAndroid.Text>
                <VoltraAndroid.Text style={{ fontSize: 42, color: '#6366F1' }}>Voltra</VoltraAndroid.Text>
                <VoltraAndroid.Text style={{ fontSize: 24, color: '#A5B4FC' }}>
                  123 456 789 updated {updateCount}
                </VoltraAndroid.Text>
              </VoltraAndroid.Column>
            </VoltraAndroid.Row>
          ),
        },
      ])
      setUpdateCount((prev) => prev + 1)
      Alert.alert('Success', 'Widget updated successfully!')
    } catch (error) {
      Alert.alert('Error', `Failed to update widget: ${error}`)
      console.error('Widget update error:', error)
    }
  }

  const handleReloadWidgets = async () => {
    try {
      await unstable_reloadAndroidWidgets(['weather'])
      Alert.alert('Success', 'Widgets reloaded!')
    } catch (error) {
      Alert.alert('Error', `Failed to reload widgets: ${error}`)
      console.error('Widget reload error:', error)
    }
  }

  const handleClearWidget = async () => {
    try {
      await unstable_clearAndroidWidget('weather')
      setUpdateCount(0)
      Alert.alert('Success', 'Widget cleared!')
    } catch (error) {
      Alert.alert('Error', `Failed to clear widget: ${error}`)
      console.error('Widget clear error:', error)
    }
  }

  const handleClearAllWidgets = async () => {
    try {
      await unstable_clearAllAndroidWidgets()
      setUpdateCount(0)
      Alert.alert('Success', 'All widgets cleared!')
    } catch (error) {
      Alert.alert('Error', `Failed to clear all widgets: ${error}`)
      console.error('Clear all widgets error:', error)
    }
  }

  return (
    <View style={styles.container}>
      <ScrollView
        style={[styles.scrollView]}
        contentContainerStyle={[styles.content, { paddingTop: insets.top, paddingBottom: insets.bottom }]}
      >
        <Text style={styles.heading}>Android Widgets Testing</Text>
        <Text style={styles.subheading}>
          Test Android home screen widgets with different sizes and content. Add the widget to your home screen first,
          then use the controls below to update it.
        </Text>

        <Card>
          <Card.Title>Weather Widget</Card.Title>
          <Card.Text>
            A responsive weather widget with three size variants that automatically adapts to available space:
          </Card.Text>
          <Card.Text style={styles.sizeDescription}>• Small (2×1): Compact temp + condition</Card.Text>
          <Card.Text style={styles.sizeDescription}>• Medium (2×2): Temp, high/low, feels like</Card.Text>
          <Card.Text style={styles.sizeDescription}>• Large (4×2): Full details with humidity & wind</Card.Text>
          <Card.Text style={styles.updateCount}>Updates: {updateCount}</Card.Text>
          <View style={styles.buttonRow}>
            <Button title="Update Widget" variant="primary" onPress={handleUpdateBasicWidget} />
            <Button title="Reload" variant="ghost" onPress={handleReloadWidgets} />
          </View>
        </Card>

        <Card>
          <Card.Title>Widget Controls</Card.Title>
          <Card.Text>
            Clear widget data or reload widgets to see the changes. Note: You may need to manually remove and re-add the
            widget to your home screen after clearing data.
          </Card.Text>
          <View style={styles.buttonRow}>
            <Button title="Clear Weather Widget" variant="secondary" onPress={handleClearWidget} />
            <Button title="Clear All Widgets" variant="secondary" onPress={handleClearAllWidgets} />
          </View>
        </Card>

        <Card>
          <Card.Title>Instructions</Card.Title>
          <Card.Text>1. Long-press on your home screen</Card.Text>
          <Card.Text>2. Tap &ldquo;Widgets&rdquo; or the widget icon</Card.Text>
          <Card.Text>3. Find &ldquo;Voltra Example&rdquo; widgets</Card.Text>
          <Card.Text>4. Add the &ldquo;Weather Widget&rdquo; to your home screen</Card.Text>
          <Card.Text>5. Come back to the app and tap &ldquo;Update Widget&rdquo;</Card.Text>
          <Card.Text>6. Check your home screen to see the updated widget</Card.Text>
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
  sizeDescription: {
    fontSize: 12,
    color: '#94A3B8',
    marginLeft: 8,
  },
  updateCount: {
    marginTop: 8,
    fontSize: 12,
    fontWeight: '600',
    color: '#8232FF',
  },
  buttonRow: {
    marginTop: 16,
    flexDirection: 'row',
    gap: 12,
  },
  footer: {
    marginTop: 24,
    alignItems: 'center',
  },
})
