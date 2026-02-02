import { useRouter } from 'expo-router'
import React, { useState } from 'react'
import { ScrollView, StyleSheet, Text, TextInput, View, Switch, useColorScheme } from 'react-native'
import { Voltra } from 'voltra'
import { VoltraWidgetPreview } from 'voltra/client'

import { Button } from '~/components/Button'
import { Card } from '~/components/Card'

const DEFAULT_TEMPLATES = {
  running: 'Time remaining: {time}',
  completed: 'Timer finished!',
}

export default function TimerTestingScreen() {
  const router = useRouter()
  const colorScheme = useColorScheme()

  // Timer State
  const [direction, setDirection] = useState<'up' | 'down'>('down')
  const [textStyle, setTextStyle] = useState<'timer' | 'relative'>('timer')
  const [showHours, setShowHours] = useState(false)
  const [durationSec, setDurationSec] = useState('300') // 5 minutes default
  const [templateJson, setTemplateJson] = useState(JSON.stringify(DEFAULT_TEMPLATES, null, 2))

  // Timestamps
  const [timerState, setTimerState] = useState<{ startAtMs?: number; endAtMs?: number; durationMs?: number }>({
    endAtMs: Date.now() + 300000,
  })

  const widgetPreviewStyle = {
    borderRadius: 16,
    backgroundColor: colorScheme === 'light' ? 'rgba(0, 0, 0, 0.4)' : 'rgba(255, 255, 255, 0.8)',
  }

  const resetTimer = () => {
    const duration = (parseInt(durationSec) || 0) * 1000
    const now = Date.now()

    if (direction === 'down') {
      setTimerState({
        startAtMs: now,
        endAtMs: now + duration,
        durationMs: duration,
      })
    } else {
      setTimerState({
        startAtMs: now,
        endAtMs: now + duration, // optional for count up, but defines range
        durationMs: duration,
      })
    }
  }

  // Timer Component for Preview
  const renderTimerWidget = () => (
    <Voltra.ZStack style={{ flex: 1, backgroundColor: '#1a1a2e', padding: 16 }}>
      <Voltra.VStack spacing={8} alignment="center">
        <Voltra.Text style={{ color: '#aaa', fontSize: 14 }}>Voltra Timer</Voltra.Text>
        <Voltra.Timer
          style={{
            color: '#ffffff',
            fontSize: 24,
            fontWeight: 'bold',
          }}
          startAtMs={timerState.startAtMs}
          endAtMs={timerState.endAtMs}
          durationMs={timerState.durationMs}
          direction={direction}
          textStyle={textStyle}
          showHours={showHours}
          textTemplates={templateJson}
        />
      </Voltra.VStack>
    </Voltra.ZStack>
  )

  return (
    <View style={styles.container}>
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.content}>
        <Text style={styles.heading}>Timer Testing</Text>
        <Text style={styles.subheading}>
          Test the VoltraTimer component behaviors, including native text updates for Live Activities.
        </Text>

        {/* Preview */}
        <Card>
          <Card.Title>Live Preview</Card.Title>
          <View style={styles.previewContainer}>
            <VoltraWidgetPreview family="systemMedium" style={widgetPreviewStyle}>
              {renderTimerWidget()}
            </VoltraWidgetPreview>
          </View>
          <Button title="Reset / Start Timer" variant="primary" onPress={resetTimer} style={{ marginTop: 16 }} />
        </Card>

        {/* Configuration */}
        <Card>
          <Card.Title>Configuration</Card.Title>

          <View style={styles.row}>
            <Text style={styles.label}>Direction</Text>
            <View style={styles.toggleGroup}>
              <Button
                title="Down"
                variant={direction === 'down' ? 'primary' : 'secondary'}
                onPress={() => setDirection('down')}
                style={styles.smButton}
              />
              <Button
                title="Up"
                variant={direction === 'up' ? 'primary' : 'secondary'}
                onPress={() => setDirection('up')}
                style={styles.smButton}
              />
            </View>
          </View>

          <View style={styles.row}>
            <Text style={styles.label}>Style</Text>
            <View style={styles.toggleGroup}>
              <Button
                title="Timer"
                variant={textStyle === 'timer' ? 'primary' : 'secondary'}
                onPress={() => setTextStyle('timer')}
                style={styles.smButton}
              />
              <Button
                title="Relative"
                variant={textStyle === 'relative' ? 'primary' : 'secondary'}
                onPress={() => setTextStyle('relative')}
                style={styles.smButton}
              />
            </View>
          </View>

          <View style={styles.row}>
            <Text style={styles.label}>Duration (seconds)</Text>
            <TextInput style={styles.input} value={durationSec} onChangeText={setDurationSec} keyboardType="numeric" />
          </View>

          <View style={styles.row}>
            <Text style={styles.label}>Show Hours</Text>
            <Switch value={showHours} onValueChange={setShowHours} />
          </View>

          <View style={styles.col}>
            <Text style={styles.label}>Templates (JSON)</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              value={templateJson}
              onChangeText={setTemplateJson}
              multiline
            />
          </View>
        </Card>

        <View style={styles.footer}>
          <Button title="Back" variant="ghost" onPress={() => router.back()} />
        </View>
      </ScrollView>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollView: { flex: 1 },
  content: { padding: 20 },
  heading: { fontSize: 24, fontWeight: '700', color: '#FFFFFF', marginBottom: 8 },
  subheading: { fontSize: 14, color: '#CBD5F5', marginBottom: 24 },
  previewContainer: { alignItems: 'center', padding: 10 },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  col: { marginBottom: 16 },
  label: { color: '#fff', fontSize: 16 },
  input: {
    backgroundColor: '#rgba(255,255,255,0.1)',
    color: '#fff',
    padding: 8,
    borderRadius: 8,
    minWidth: 100,
    textAlign: 'right',
  },
  textArea: { textAlign: 'left', height: 100, textAlignVertical: 'top' },
  toggleGroup: { flexDirection: 'row', gap: 8 },
  smButton: { paddingVertical: 6, paddingHorizontal: 12 },
  footer: { marginTop: 24, alignItems: 'center' },
})
