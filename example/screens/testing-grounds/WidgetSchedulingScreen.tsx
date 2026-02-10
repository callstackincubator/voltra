import { useRouter } from 'expo-router'
import React, { useState } from 'react'
import { Alert, ScrollView, StyleSheet, Text, TextInput, useColorScheme, View } from 'react-native'
import { Voltra } from 'voltra'
import { reloadWidgets, scheduleWidget, VoltraWidgetPreview } from 'voltra/client'

import { Button } from '~/components/Button'
import { Card } from '~/components/Card'

export default function WidgetSchedulingScreen() {
  const colorScheme = useColorScheme()
  const router = useRouter()
  const [isScheduling, setIsScheduling] = useState(false)
  const [minutesUntilSecond, setMinutesUntilSecond] = useState('2')
  const [minutesUntilThird, setMinutesUntilThird] = useState('5')
  const [scheduledTimes, setScheduledTimes] = useState<{ past: string; second: string; third: string } | null>(null)

  const widgetPreviewStyle = {
    borderRadius: 16,
    backgroundColor: colorScheme === 'light' ? 'rgba(0, 0, 0, 0.4)' : 'rgba(255, 255, 255, 0.8)',
  }

  const handleScheduleTimeline = async () => {
    setIsScheduling(true)
    try {
      const now = new Date()
      const secondMinutes = parseInt(minutesUntilSecond) || 2
      const thirdMinutes = parseInt(minutesUntilThird) || 5

      // Entry 1: Yesterday (past entry - shows as current state)
      const yesterday = new Date(now)
      yesterday.setDate(yesterday.getDate() - 1)
      yesterday.setHours(12, 0, 0, 0)

      // Entry 2: Future entry (configured minutes from now)
      const secondEntry = new Date(now.getTime() + secondMinutes * 60 * 1000)

      // Entry 3: Future entry (configured minutes from now)
      const thirdEntry = new Date(now.getTime() + thirdMinutes * 60 * 1000)

      const entries = [
        {
          date: yesterday,
          variants: {
            systemSmall: (
              <Voltra.ZStack style={{ flex: 1, backgroundColor: '#2C3E50', padding: 12 }}>
                <Voltra.VStack spacing={4} alignment="center">
                  <Voltra.Text style={{ fontSize: 32, fontWeight: '700', color: '#3498DB' }}>STATE 1</Voltra.Text>
                  <Voltra.Text style={{ fontSize: 12, color: '#ECF0F1' }}>Current</Voltra.Text>
                  <Voltra.Text style={{ fontSize: 10, color: '#BDC3C7' }}>Yesterday</Voltra.Text>
                </Voltra.VStack>
              </Voltra.ZStack>
            ),
            systemMedium: (
              <Voltra.ZStack style={{ flex: 1, backgroundColor: '#2C3E50', padding: 16 }}>
                <Voltra.VStack spacing={8} alignment="center">
                  <Voltra.Text style={{ fontSize: 48, fontWeight: '700', color: '#3498DB' }}>STATE 1</Voltra.Text>
                  <Voltra.Text style={{ fontSize: 16, color: '#ECF0F1' }}>Current State</Voltra.Text>
                  <Voltra.Text style={{ fontSize: 14, color: '#BDC3C7' }}>Scheduled: Yesterday</Voltra.Text>
                </Voltra.VStack>
              </Voltra.ZStack>
            ),
            systemLarge: (
              <Voltra.ZStack style={{ flex: 1, backgroundColor: '#2C3E50', padding: 20 }}>
                <Voltra.VStack spacing={12} alignment="center">
                  <Voltra.Text style={{ fontSize: 64, fontWeight: '700', color: '#3498DB' }}>STATE 1</Voltra.Text>
                  <Voltra.Text style={{ fontSize: 20, color: '#ECF0F1' }}>Current State</Voltra.Text>
                  <Voltra.Text style={{ fontSize: 18, color: '#BDC3C7' }}>Scheduled: Yesterday at Noon</Voltra.Text>
                </Voltra.VStack>
              </Voltra.ZStack>
            ),
          },
        },
        {
          date: secondEntry,
          variants: {
            systemSmall: (
              <Voltra.ZStack style={{ flex: 1, backgroundColor: '#16A085', padding: 12 }}>
                <Voltra.VStack spacing={4} alignment="center">
                  <Voltra.Text style={{ fontSize: 32, fontWeight: '700', color: '#F1C40F' }}>STATE 2</Voltra.Text>
                  <Voltra.Text style={{ fontSize: 12, color: '#ECF0F1' }}>+{secondMinutes} min</Voltra.Text>
                </Voltra.VStack>
              </Voltra.ZStack>
            ),
            systemMedium: (
              <Voltra.ZStack style={{ flex: 1, backgroundColor: '#16A085', padding: 16 }}>
                <Voltra.VStack spacing={8} alignment="center">
                  <Voltra.Text style={{ fontSize: 48, fontWeight: '700', color: '#F1C40F' }}>STATE 2</Voltra.Text>
                  <Voltra.Text style={{ fontSize: 16, color: '#ECF0F1' }}>Second State</Voltra.Text>
                  <Voltra.Text style={{ fontSize: 14, color: '#E8F8F5' }}>
                    {secondEntry.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}
                  </Voltra.Text>
                </Voltra.VStack>
              </Voltra.ZStack>
            ),
            systemLarge: (
              <Voltra.ZStack style={{ flex: 1, backgroundColor: '#16A085', padding: 20 }}>
                <Voltra.VStack spacing={12} alignment="center">
                  <Voltra.Text style={{ fontSize: 64, fontWeight: '700', color: '#F1C40F' }}>STATE 2</Voltra.Text>
                  <Voltra.Text style={{ fontSize: 20, color: '#ECF0F1' }}>Second State</Voltra.Text>
                  <Voltra.Text style={{ fontSize: 18, color: '#E8F8F5' }}>
                    {secondEntry.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}
                  </Voltra.Text>
                </Voltra.VStack>
              </Voltra.ZStack>
            ),
          },
        },
        {
          date: thirdEntry,
          variants: {
            systemSmall: (
              <Voltra.ZStack style={{ flex: 1, backgroundColor: '#8E44AD', padding: 12 }}>
                <Voltra.VStack spacing={4} alignment="center">
                  <Voltra.Text style={{ fontSize: 32, fontWeight: '700', color: '#E74C3C' }}>STATE 3</Voltra.Text>
                  <Voltra.Text style={{ fontSize: 12, color: '#ECF0F1' }}>+{thirdMinutes} min</Voltra.Text>
                </Voltra.VStack>
              </Voltra.ZStack>
            ),
            systemMedium: (
              <Voltra.ZStack style={{ flex: 1, backgroundColor: '#8E44AD', padding: 16 }}>
                <Voltra.VStack spacing={8} alignment="center">
                  <Voltra.Text style={{ fontSize: 48, fontWeight: '700', color: '#E74C3C' }}>STATE 3</Voltra.Text>
                  <Voltra.Text style={{ fontSize: 16, color: '#ECF0F1' }}>Third State</Voltra.Text>
                  <Voltra.Text style={{ fontSize: 14, color: '#E8F8F5' }}>
                    {thirdEntry.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}
                  </Voltra.Text>
                </Voltra.VStack>
              </Voltra.ZStack>
            ),
            systemLarge: (
              <Voltra.ZStack style={{ flex: 1, backgroundColor: '#8E44AD', padding: 20 }}>
                <Voltra.VStack spacing={12} alignment="center">
                  <Voltra.Text style={{ fontSize: 64, fontWeight: '700', color: '#E74C3C' }}>STATE 3</Voltra.Text>
                  <Voltra.Text style={{ fontSize: 20, color: '#ECF0F1' }}>Third State</Voltra.Text>
                  <Voltra.Text style={{ fontSize: 18, color: '#E8F8F5' }}>
                    {thirdEntry.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}
                  </Voltra.Text>
                </Voltra.VStack>
              </Voltra.ZStack>
            ),
          },
        },
      ]

      await scheduleWidget('weather', entries)
      await reloadWidgets(['weather'])

      // Format times for display
      const formatter = new Intl.DateTimeFormat('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        second: '2-digit',
      })

      setScheduledTimes({
        past: formatter.format(yesterday),
        second: formatter.format(secondEntry),
        third: formatter.format(thirdEntry),
      })

      Alert.alert(
        'Timeline Scheduled',
        `Three states scheduled:\n\n` +
          `State 1: ${formatter.format(yesterday)}\n` +
          `State 2: ${formatter.format(secondEntry)} (+${secondMinutes}m)\n` +
          `State 3: ${formatter.format(thirdEntry)} (+${thirdMinutes}m)\n\n` +
          `Watch the widget transition between states!`,
        [{ text: 'OK' }]
      )
    } catch (error) {
      console.error('Failed to schedule timeline:', error)
      Alert.alert('Error', 'Failed to schedule timeline. Check console for details.')
    } finally {
      setIsScheduling(false)
    }
  }

  const handleClearTimeline = async () => {
    try {
      // Clear by updating with current content
      await scheduleWidget('weather', [])
      await reloadWidgets(['weather'])
      setScheduledTimes(null)
      Alert.alert('Timeline Cleared', 'The widget timeline has been cleared.')
    } catch (error) {
      console.error('Failed to clear timeline:', error)
      Alert.alert('Error', 'Failed to clear timeline. Check console for details.')
    }
  }

  return (
    <View style={styles.container}>
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.content}>
        <Text style={styles.heading}>Widget Scheduling</Text>
        <Text style={styles.subheading}>
          Test widget timeline scheduling with multiple states. Configure when each state should appear and watch the
          widget transition automatically.
        </Text>

        {/* Configuration */}
        <Card>
          <Card.Title>⚙️ Configuration</Card.Title>
          <Card.Text>Set when each future state should appear:</Card.Text>

          <View style={styles.configRow}>
            <Text style={styles.configLabel}>State 2 (minutes from now):</Text>
            <TextInput
              style={styles.input}
              value={minutesUntilSecond}
              onChangeText={setMinutesUntilSecond}
              keyboardType="numeric"
              placeholder="2"
            />
          </View>

          <View style={styles.configRow}>
            <Text style={styles.configLabel}>State 3 (minutes from now):</Text>
            <TextInput
              style={styles.input}
              value={minutesUntilThird}
              onChangeText={setMinutesUntilThird}
              keyboardType="numeric"
              placeholder="5"
            />
          </View>
        </Card>

        {/* Schedule Timeline */}
        <Card>
          <Card.Title>📅 Schedule Timeline</Card.Title>
          <Card.Text>
            Schedules three widget states:{'\n\n'}• State 1 (Blue): Yesterday - shows as current{'\n'}• State 2 (Green):{' '}
            {minutesUntilSecond || '2'} minutes from now{'\n'}• State 3 (Purple): {minutesUntilThird || '5'} minutes
            from now{'\n\n'}
            Add the widget to your home screen to see it transition between states.
          </Card.Text>
          <View style={styles.buttonGroup}>
            <Button
              title="Schedule Timeline"
              variant="primary"
              onPress={handleScheduleTimeline}
              disabled={isScheduling}
              style={{ flex: 1 }}
            />
            {scheduledTimes && (
              <Button title="Clear" variant="secondary" onPress={handleClearTimeline} style={{ minWidth: 80 }} />
            )}
          </View>
        </Card>

        {/* Scheduled Times */}
        {scheduledTimes && (
          <Card>
            <Card.Title>⏰ Scheduled Times</Card.Title>
            <View style={styles.timelineInfo}>
              <View style={styles.timelineEntry}>
                <View style={[styles.statusDot, { backgroundColor: '#3498DB' }]} />
                <View style={styles.timelineText}>
                  <Text style={styles.timelineLabel}>State 1 (Current)</Text>
                  <Text style={styles.timelineTime}>{scheduledTimes.past}</Text>
                </View>
              </View>
              <View style={styles.timelineEntry}>
                <View style={[styles.statusDot, { backgroundColor: '#16A085' }]} />
                <View style={styles.timelineText}>
                  <Text style={styles.timelineLabel}>State 2</Text>
                  <Text style={styles.timelineTime}>{scheduledTimes.second}</Text>
                </View>
              </View>
              <View style={styles.timelineEntry}>
                <View style={[styles.statusDot, { backgroundColor: '#8E44AD' }]} />
                <View style={styles.timelineText}>
                  <Text style={styles.timelineLabel}>State 3</Text>
                  <Text style={styles.timelineTime}>{scheduledTimes.third}</Text>
                </View>
              </View>
            </View>
          </Card>
        )}

        {/* Previews */}
        <Card>
          <Card.Title>Widget Previews</Card.Title>

          <Text style={styles.previewLabel}>State 1 (Current) - Blue</Text>
          <View style={styles.previewContainer}>
            <VoltraWidgetPreview family="systemMedium" style={widgetPreviewStyle}>
              <Voltra.ZStack style={{ flex: 1, backgroundColor: '#2C3E50', padding: 16 }}>
                <Voltra.VStack spacing={8} alignment="center">
                  <Voltra.Text style={{ fontSize: 48, fontWeight: '700', color: '#3498DB' }}>STATE 1</Voltra.Text>
                  <Voltra.Text style={{ fontSize: 16, color: '#ECF0F1' }}>Current State</Voltra.Text>
                  <Voltra.Text style={{ fontSize: 14, color: '#BDC3C7' }}>Scheduled: Yesterday</Voltra.Text>
                </Voltra.VStack>
              </Voltra.ZStack>
            </VoltraWidgetPreview>
          </View>

          <Text style={styles.previewLabel}>State 2 - Green</Text>
          <View style={styles.previewContainer}>
            <VoltraWidgetPreview family="systemMedium" style={widgetPreviewStyle}>
              <Voltra.ZStack style={{ flex: 1, backgroundColor: '#16A085', padding: 16 }}>
                <Voltra.VStack spacing={8} alignment="center">
                  <Voltra.Text style={{ fontSize: 48, fontWeight: '700', color: '#F1C40F' }}>STATE 2</Voltra.Text>
                  <Voltra.Text style={{ fontSize: 16, color: '#ECF0F1' }}>Second State</Voltra.Text>
                  <Voltra.Text style={{ fontSize: 14, color: '#E8F8F5' }}>
                    +{minutesUntilSecond || '2'} minutes
                  </Voltra.Text>
                </Voltra.VStack>
              </Voltra.ZStack>
            </VoltraWidgetPreview>
          </View>

          <Text style={styles.previewLabel}>State 3 - Purple</Text>
          <View style={styles.previewContainer}>
            <VoltraWidgetPreview family="systemMedium" style={widgetPreviewStyle}>
              <Voltra.ZStack style={{ flex: 1, backgroundColor: '#8E44AD', padding: 16 }}>
                <Voltra.VStack spacing={8} alignment="center">
                  <Voltra.Text style={{ fontSize: 48, fontWeight: '700', color: '#E74C3C' }}>STATE 3</Voltra.Text>
                  <Voltra.Text style={{ fontSize: 16, color: '#ECF0F1' }}>Third State</Voltra.Text>
                  <Voltra.Text style={{ fontSize: 14, color: '#E8F8F5' }}>
                    +{minutesUntilThird || '5'} minutes
                  </Voltra.Text>
                </Voltra.VStack>
              </Voltra.ZStack>
            </VoltraWidgetPreview>
          </View>
        </Card>

        {/* How to Test */}
        <Card>
          <Card.Title>📝 How to Test</Card.Title>
          <Card.Text>
            1. Configure the timing for states 2 and 3 above{'\n'}
            2. Click Schedule Timeline{'\n'}
            3. Add the Weather widget to your home screen{'\n'}
            4. Verify it shows State 1 (blue background){'\n'}
            5. Wait for the scheduled times{'\n'}
            6. Watch the widget automatically transition:{'\n'}
            {'   '}• State 1 (Blue) → State 2 (Green) → State 3 (Purple){'\n\n'}
            <Text style={styles.bold}>Note:</Text> iOS may delay widget updates based on battery level, widget
            visibility, and system load. For immediate updates during testing, keep Xcode attached or use shorter time
            intervals.
          </Card.Text>
        </Card>

        {/* Back Button */}
        <View style={styles.footer}>
          <Button title="Back to Testing Grounds" variant="ghost" onPress={() => router.back()} />
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
    marginBottom: 8,
  },
  subheading: {
    fontSize: 14,
    lineHeight: 20,
    color: '#CBD5F5',
    marginBottom: 24,
  },
  bold: {
    fontWeight: '700',
    color: '#FFFFFF',
  },
  configRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 12,
  },
  configLabel: {
    fontSize: 16,
    color: '#FFFFFF',
    flex: 1,
  },
  input: {
    backgroundColor: 'rgba(255,255,255,0.1)',
    color: '#FFFFFF',
    padding: 8,
    borderRadius: 8,
    minWidth: 80,
    textAlign: 'right',
    fontSize: 16,
  },
  buttonGroup: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 16,
  },
  timelineInfo: {
    marginTop: 12,
    gap: 16,
  },
  timelineEntry: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  statusDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  timelineText: {
    flex: 1,
  },
  timelineLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 2,
  },
  timelineTime: {
    fontSize: 14,
    color: '#CBD5F5',
  },
  previewLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
    marginTop: 20,
    marginBottom: 8,
  },
  previewContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
  },
  footer: {
    marginTop: 24,
    alignItems: 'center',
  },
})
