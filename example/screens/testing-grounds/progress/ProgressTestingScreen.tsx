import { useRouter } from 'expo-router'
import React, { useState } from 'react'
import { ScrollView, StyleSheet, Text, useColorScheme, View } from 'react-native'
import { Voltra } from 'voltra'
import { VoltraWidgetPreview } from 'voltra/client'

import { Button } from '~/components/Button'
import { Card } from '~/components/Card'

export default function ProgressTestingScreen() {
  const router = useRouter()
  const colorScheme = useColorScheme()

  // State for simple controls
  const [progressValue, setProgressValue] = useState(65)
  const [timerEndAt] = useState(Date.now() + 600000) // 10 minutes from now

  const widgetPreviewStyle = {
    borderRadius: 16,
    backgroundColor: colorScheme === 'light' ? 'rgba(0, 0, 0, 0.4)' : 'rgba(255, 255, 255, 0.8)',
  }

  return (
    <View style={styles.container}>
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.content}>
        <Text style={styles.heading}>Progress Testing</Text>
        <Text style={styles.subheading}>
          Test VoltraLinearProgressView and VoltraCircularProgressView with new label and currentValueLabel support.
        </Text>

        {/* 1. Linear Progress Showcase */}
        <Card>
          <Card.Title>Linear Progress Variants</Card.Title>
          <View style={styles.previewContainer}>
            <VoltraWidgetPreview family="systemMedium" style={widgetPreviewStyle}>
              <Voltra.VStack style={{ flex: 1, backgroundColor: '#1a1a2e', padding: 16 }} spacing={12}>
                {/* Standard determinate */}
                <Voltra.LinearProgressView
                  value={60}
                  maximumValue={100}
                  label={<Voltra.Text style={{ color: '#aaa', fontSize: 12 }}>Standard Linear</Voltra.Text>}
                  currentValueLabel={<Voltra.Text>{progressValue}%</Voltra.Text>}
                />

                {/* Custom styled determinate */}
                <Voltra.LinearProgressView
                  value={50}
                  maximumValue={100}
                  height={8}
                  cornerRadius={4}
                  trackColor="#FF0000"
                  progressColor="#8232FF"
                  label={<Voltra.Text style={{ color: '#8232FF', fontWeight: 'bold' }}>Custom Styled</Voltra.Text>}
                  currentValueLabel={
                    <Voltra.HStack>
                      <Voltra.Spacer />
                      <Voltra.Text style={{ fontSize: 10, color: '#8232FF' }}>{progressValue} of 100</Voltra.Text>
                    </Voltra.HStack>
                  }
                />

                {/* Timer-based linear */}
                <Voltra.LinearProgressView
                  startAtMs={Date.now()}
                  endAtMs={timerEndAt}
                  label={<Voltra.Text style={{ color: '#aaa' }}>Timer Linear</Voltra.Text>}
                  currentValueLabel={<Voltra.Timer endAtMs={timerEndAt} style={{ fontSize: 12, color: '#FFB800' }} />}
                />
              </Voltra.VStack>
            </VoltraWidgetPreview>
          </View>
        </Card>

        {/* 2. Circular Progress Showcase */}
        <Card>
          <Card.Title>Circular Progress Variants</Card.Title>
          <View style={styles.previewContainer}>
            <VoltraWidgetPreview family="systemSmall" style={widgetPreviewStyle}>
              <Voltra.VStack
                style={{ flex: 1, backgroundColor: '#1a1a2e', padding: 12 }}
                spacing={8}
                alignment="center"
              >
                <Voltra.CircularProgressView
                  value={progressValue}
                  maximumValue={100}
                  lineWidth={6}
                  progressColor="#00D1FF"
                  label={<Voltra.Text style={{ color: '#aaa', fontSize: 10 }}>Uptime</Voltra.Text>}
                  currentValueLabel={
                    <Voltra.Text style={{ color: '#00D1FF', fontSize: 12, fontWeight: 'bold' }}>
                      {progressValue}%
                    </Voltra.Text>
                  }
                  style={{ width: 80, height: 80 }}
                />
              </Voltra.VStack>
            </VoltraWidgetPreview>

            <View style={{ width: 16 }} />

            <VoltraWidgetPreview family="systemSmall" style={widgetPreviewStyle}>
              <Voltra.VStack
                style={{ flex: 1, backgroundColor: '#1a1a2e', padding: 12 }}
                spacing={8}
                alignment="center"
              >
                <Voltra.CircularProgressView
                  startAtMs={Date.now()}
                  endAtMs={timerEndAt}
                  lineWidth={4}
                  progressColor="#FF3B30"
                  label={<Voltra.Symbol name="timer" tintColor="#FF3B30" size={14} />}
                  currentValueLabel={<Voltra.Timer endAtMs={timerEndAt} style={{ fontSize: 10 }} />}
                  style={{ width: 60, height: 60 }}
                />
              </Voltra.VStack>
            </VoltraWidgetPreview>
          </View>
        </Card>

        {/* 3. Real-world Examples */}
        <Card>
          <Card.Title>Complex Combinations</Card.Title>
          <View style={styles.previewContainer}>
            <VoltraWidgetPreview family="systemMedium" style={widgetPreviewStyle}>
              <Voltra.VStack style={{ flex: 1, backgroundColor: '#000', padding: 16 }} spacing={16}>
                <Voltra.HStack spacing={12}>
                  <Voltra.Symbol name="icloud.and.arrow.down.fill" tintColor="#007AFF" size={24} />
                  <Voltra.VStack style={{ flex: 1 }}>
                    <Voltra.LinearProgressView
                      value={progressValue}
                      maximumValue={100}
                      height={6}
                      progressColor="#007AFF"
                      label={
                        <Voltra.Text style={{ color: '#fff', fontSize: 14, fontWeight: '600' }}>
                          Downloading Assets...
                        </Voltra.Text>
                      }
                      currentValueLabel={
                        <Voltra.HStack>
                          <Voltra.Text style={{ color: '#888', fontSize: 11 }}>
                            {(progressValue * 1.2).toFixed(1)} MB of 120 MB
                          </Voltra.Text>
                          <Voltra.Spacer />
                          <Voltra.Text style={{ color: '#007AFF', fontSize: 11, fontWeight: 'bold' }}>
                            {progressValue}%
                          </Voltra.Text>
                        </Voltra.HStack>
                      }
                    />
                  </Voltra.VStack>
                </Voltra.HStack>

                <Voltra.Divider />

                <Voltra.HStack spacing={20} alignment="center">
                  <Voltra.CircularProgressView
                    value={75}
                    lineWidth={8}
                    progressColor="#34C759"
                    currentValueLabel={<Voltra.Symbol name="checkmark" tintColor="#34C759" size={20} />}
                    style={{ width: 60, height: 60 }}
                  />
                  <Voltra.VStack>
                    <Voltra.Text style={{ color: '#fff', fontSize: 16, fontWeight: 'bold' }}>Goal Reached!</Voltra.Text>
                    <Voltra.Text style={{ color: '#888', fontSize: 13 }}>You completed your daily rings.</Voltra.Text>
                  </Voltra.VStack>
                </Voltra.HStack>
              </Voltra.VStack>
            </VoltraWidgetPreview>
          </View>
        </Card>

        {/* Controls */}
        <Card>
          <Card.Title>Interactive Controls</Card.Title>
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
})
