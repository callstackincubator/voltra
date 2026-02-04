import { useRouter } from 'expo-router'
import React, { useState } from 'react'
import { ScrollView, StyleSheet, Text, TextInput, useColorScheme, View } from 'react-native'
import { Voltra } from 'voltra'
import { VoltraWidgetPreview } from 'voltra/client'

import { Button } from '~/components/Button'
import { Card } from '~/components/Card'

export default function ProgressTestingScreen() {
  const router = useRouter()
  const colorScheme = useColorScheme()

  // State for interactivity
  const [type, setType] = useState<'linear' | 'circular'>('linear')
  const [mode, setMode] = useState<'determinate' | 'timer' | 'indeterminate'>('determinate')
  const [progressValue, setProgressValue] = useState(65)
  const [durationSec, setDurationSec] = useState('60')
  const [timerState, setTimerState] = useState<{ startAtMs?: number; endAtMs?: number }>({
    startAtMs: Date.now(),
    endAtMs: Date.now() + 60000,
  })

  // Styling state
  const [trackColor, setTrackColor] = useState('#333344')
  const [progressColor, setProgressColor] = useState('#007AFF')
  const [cornerRadius, setCornerRadius] = useState(4)
  const [height, setHeight] = useState(8)
  const [lineWidth, setLineWidth] = useState(6)
  const [useThumb, setUseThumb] = useState(false)
  const [countDown, setCountDown] = useState(false)

  const resetTimer = () => {
    const duration = (parseInt(durationSec) || 0) * 1000
    const now = Date.now()
    setTimerState({
      startAtMs: now,
      endAtMs: now + duration,
    })
  }

  const widgetPreviewStyle = {
    borderRadius: 16,
    backgroundColor: colorScheme === 'light' ? 'rgba(0, 0, 0, 0.4)' : 'rgba(255, 255, 255, 0.8)',
  }

  // Effect to handle unsupported modes
  React.useEffect(() => {
    if (type === 'circular' && mode === 'timer') {
      setMode('determinate')
    }
    if (type === 'linear' && mode === 'indeterminate') {
      setMode('determinate')
    }
  }, [type, mode])

  const renderProgressWidget = () => {
    const commonProps: any = {
      label: (
        <Voltra.Text style={{ color: '#aaa', fontSize: 12 }}>
          {type === 'linear' ? 'Linear' : 'Circular'} Progress
        </Voltra.Text>
      ),
      currentValueLabel:
        mode === 'determinate' ? (
          <Voltra.Text style={{ color: '#fff', fontSize: 12 }}>{progressValue}%</Voltra.Text>
        ) : mode === 'timer' ? (
          <Voltra.Timer endAtMs={timerState.endAtMs} style={{ fontSize: 12, color: '#FFB800' }} />
        ) : null,
      trackColor,
      progressColor,
    }

    const modeProps =
      mode === 'determinate'
        ? { value: progressValue, maximumValue: 100 }
        : mode === 'timer'
        ? { startAtMs: timerState.startAtMs, endAtMs: timerState.endAtMs, countDown }
        : {}

    return (
      <Voltra.ZStack style={{ flex: 1, backgroundColor: '#1a1a2e', padding: 16 }}>
        <Voltra.VStack style={{ flex: 1 }} spacing={12} alignment={type === 'circular' ? 'center' : undefined}>
          {type === 'linear' ? (
            <Voltra.LinearProgressView
              {...commonProps}
              {...modeProps}
              cornerRadius={cornerRadius}
              height={height}
              thumb={useThumb ? <Voltra.Symbol name="circle.fill" size={height * 2} tintColor="#fff" /> : undefined}
            />
          ) : (
            <Voltra.CircularProgressView
              {...commonProps}
              {...modeProps}
              lineWidth={lineWidth}
              style={{ width: 80, height: 80 }}
            />
          )}
        </Voltra.VStack>
      </Voltra.ZStack>
    )
  }

  return (
    <View style={styles.container}>
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.content}>
        <Text style={styles.heading}>Progress Testing</Text>
        <Text style={styles.subheading}>
          Test VoltraLinearProgressView and VoltraCircularProgressView with new label and styling support.
        </Text>

        {/* 1. Live Preview */}
        <Card>
          <Card.Title>Live Preview</Card.Title>
          <View style={styles.previewContainer}>
            <VoltraWidgetPreview family="systemMedium" style={widgetPreviewStyle}>
              {renderProgressWidget()}
            </VoltraWidgetPreview>
          </View>
          {mode === 'timer' && (
            <Button title="Reset / Start Timer" variant="primary" onPress={resetTimer} style={{ marginTop: 16 }} />
          )}
        </Card>

        {/* 2. Configuration */}
        <Card>
          <Card.Title>Base Configuration</Card.Title>

          <View style={styles.row}>
            <Text style={styles.label}>Type</Text>
            <View style={styles.toggleGroup}>
              <Button
                title="Linear"
                variant={type === 'linear' ? 'primary' : 'secondary'}
                onPress={() => setType('linear')}
                style={styles.smButton}
              />
              <Button
                title="Circular"
                variant={type === 'circular' ? 'primary' : 'secondary'}
                onPress={() => setType('circular')}
                style={styles.smButton}
              />
            </View>
          </View>

          <View style={styles.row}>
            <Text style={styles.label}>Mode</Text>
            <View style={styles.toggleGroup}>
              <Button
                title="Determinate"
                variant={mode === 'determinate' ? 'primary' : 'secondary'}
                onPress={() => setMode('determinate')}
                style={styles.smButton}
              />
              <Button
                title="Timer"
                disabled={type === 'circular'}
                variant={mode === 'timer' ? 'primary' : 'secondary'}
                onPress={() => setMode('timer')}
                style={styles.smButton}
              />
              <Button
                title="Indeterminate"
                disabled={type === 'linear'}
                variant={mode === 'indeterminate' ? 'primary' : 'secondary'}
                onPress={() => setMode('indeterminate')}
                style={styles.smButton}
              />
            </View>
          </View>

          {mode === 'determinate' && (
            <View style={styles.row}>
              <Text style={styles.label}>Progress: {progressValue}%</Text>
              <View style={styles.toggleGroup}>
                <Button
                  title="-10"
                  variant="secondary"
                  onPress={() => setProgressValue(Math.max(0, progressValue - 10))}
                  style={styles.smButton}
                />
                <Button
                  title="+10"
                  variant="secondary"
                  onPress={() => setProgressValue(Math.min(100, progressValue + 10))}
                  style={styles.smButton}
                />
              </View>
            </View>
          )}

          {mode === 'timer' && (
            <>
              <View style={styles.row}>
                <Text style={styles.label}>Duration (seconds)</Text>
                <TextInput
                  style={styles.input}
                  value={durationSec}
                  onChangeText={setDurationSec}
                  keyboardType="numeric"
                />
              </View>
              <View style={styles.row}>
                <Text style={styles.label}>Count Down</Text>
                <Button
                  title={countDown ? 'ON' : 'OFF'}
                  variant={countDown ? 'primary' : 'secondary'}
                  onPress={() => setCountDown(!countDown)}
                  style={styles.smButton}
                />
              </View>
              <Text style={styles.info}>Note: Custom styling is ignored for Timers to support realtime updates.</Text>
            </>
          )}
        </Card>

        {/* 3. Styling Configuration */}
        <Card>
          <Card.Title>Styling Configuration</Card.Title>

          <View style={styles.row}>
            <Text style={styles.label}>Track Color</Text>
            <TextInput style={styles.input} value={trackColor} onChangeText={setTrackColor} />
          </View>

          <View style={styles.row}>
            <Text style={styles.label}>Progress Color</Text>
            <TextInput style={styles.input} value={progressColor} onChangeText={setProgressColor} />
          </View>

          {type === 'linear' ? (
            <>
              <View style={styles.row}>
                <Text style={styles.label}>Height: {height}</Text>
                <View style={styles.toggleGroup}>
                  <Button
                    title="Small"
                    variant={height === 4 ? 'primary' : 'secondary'}
                    onPress={() => setHeight(4)}
                    style={styles.smButton}
                  />
                  <Button
                    title="Medium"
                    variant={height === 8 ? 'primary' : 'secondary'}
                    onPress={() => setHeight(8)}
                    style={styles.smButton}
                  />
                  <Button
                    title="Large"
                    variant={height === 16 ? 'primary' : 'secondary'}
                    onPress={() => setHeight(16)}
                    style={styles.smButton}
                  />
                </View>
              </View>
              <View style={styles.row}>
                <Text style={styles.label}>Corner Radius: {cornerRadius}</Text>
                <View style={styles.toggleGroup}>
                  <Button
                    title="None"
                    variant={cornerRadius === 0 ? 'primary' : 'secondary'}
                    onPress={() => setCornerRadius(0)}
                    style={styles.smButton}
                  />
                  <Button
                    title="Small"
                    variant={cornerRadius === 4 ? 'primary' : 'secondary'}
                    onPress={() => setCornerRadius(4)}
                    style={styles.smButton}
                  />
                  <Button
                    title="Full"
                    variant={cornerRadius === 20 ? 'primary' : 'secondary'}
                    onPress={() => setCornerRadius(20)}
                    style={styles.smButton}
                  />
                </View>
              </View>
              <View style={styles.row}>
                <Text style={styles.label}>Custom Thumb</Text>
                <Button
                  title={useThumb ? 'ON' : 'OFF'}
                  variant={useThumb ? 'primary' : 'secondary'}
                  onPress={() => setUseThumb(!useThumb)}
                  style={styles.smButton}
                />
              </View>
            </>
          ) : (
            <View style={styles.row}>
              <Text style={styles.label}>Line Width: {lineWidth}</Text>
              <View style={styles.toggleGroup}>
                <Button
                  title="2"
                  variant={lineWidth === 2 ? 'primary' : 'secondary'}
                  onPress={() => setLineWidth(2)}
                  style={styles.smButton}
                />
                <Button
                  title="6"
                  variant={lineWidth === 6 ? 'primary' : 'secondary'}
                  onPress={() => setLineWidth(6)}
                  style={styles.smButton}
                />
                <Button
                  title="12"
                  variant={lineWidth === 12 ? 'primary' : 'secondary'}
                  onPress={() => setLineWidth(12)}
                  style={styles.smButton}
                />
              </View>
            </View>
          )}
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
  previewContainer: { flexDirection: 'row', justifyContent: 'center', flexWrap: 'wrap', gap: 12, padding: 10 },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  label: { color: '#fff', fontSize: 16 },
  toggleGroup: { flexDirection: 'row', gap: 8 },
  smButton: { paddingVertical: 6, paddingHorizontal: 12 },
  footer: { marginTop: 24, marginBottom: 40, alignItems: 'center' },
  input: {
    backgroundColor: 'rgba(255,255,255,0.1)',
    color: '#fff',
    padding: 8,
    borderRadius: 8,
    minWidth: 100,
    textAlign: 'right',
  },
  info: { color: '#FFB800', fontSize: 12, marginTop: -8, marginBottom: 16 },
})
