import { useRouter } from 'expo-router'
import React, { useState } from 'react'
import { ScrollView, StyleSheet, Text, View } from 'react-native'
import { VoltraAndroid } from '@use-voltra/android'
import { AndroidWidgetFamily, VoltraWidgetPreview } from '@use-voltra/android-client'

import { Button } from '~/components/Button'
import { Card } from '~/components/Card'
import { ScreenLayout } from '~/components/ScreenLayout'

type GradientType = 'linear' | 'radial' | 'conic'
type Direction = 'to right' | 'to bottom' | 'to bottom right' | 'to top right'

const GRADIENT_TYPES: GradientType[] = ['linear', 'radial', 'conic']
const DIRECTIONS: Direction[] = ['to right', 'to bottom', 'to bottom right', 'to top right']
const ANGLE_OPTIONS = [0, 45, 90, 135, 180]

const PRESETS: { label: string; colors: [string, string, ...string[]] }[] = [
  { label: 'Sunset', colors: ['#FF6B6B', '#FFD93D'] },
  { label: 'Ocean', colors: ['#0093E9', '#80D0C7'] },
  { label: 'Purple', colors: ['#8B5CF6', '#EC4899'] },
  { label: 'Tri-color', colors: ['#EF4444', '#10B981', '#3B82F6'] },
]

const ANDROID_WIDGET_FAMILIES: { id: AndroidWidgetFamily; title: string }[] = [
  { id: 'small', title: 'Small' },
  { id: 'mediumSquare', title: 'Square' },
  { id: 'mediumWide', title: 'Wide' },
  { id: 'large', title: 'Large' },
]

const getPositionedStops = (colors: [string, string, ...string[]]) =>
  colors
    .map((color, idx) => {
      const pct = Math.round((idx / (colors.length - 1)) * 100)
      return `${color} ${pct}%`
    })
    .join(', ')

function WidgetPreview({
  children,
  family = 'mediumWide',
}: {
  children: React.ReactNode
  family?: AndroidWidgetFamily
}) {
  return (
    <View style={styles.previewContainer}>
      <VoltraWidgetPreview family={family} style={styles.widgetBorder}>
        {children}
      </VoltraWidgetPreview>
    </View>
  )
}

export default function AndroidGradientPlaygroundScreen() {
  const router = useRouter()
  const [gradientType, setGradientType] = useState<GradientType>('linear')
  const [direction, setDirection] = useState<Direction>('to right')
  const [angle, setAngle] = useState(90)
  const [useAngle, setUseAngle] = useState(false)
  const [preset, setPreset] = useState(0)
  const [borderRadius, setBorderRadius] = useState(12)
  const [selectedFamily, setSelectedFamily] = useState<AndroidWidgetFamily>('mediumWide')

  const positionedStops = getPositionedStops(PRESETS[preset].colors)
  const gradient = (() => {
    if (gradientType === 'radial') {
      return `radial-gradient(circle at center, ${positionedStops})`
    }
    if (gradientType === 'conic') {
      return `conic-gradient(from ${angle}deg at center, ${positionedStops})`
    }
    return `linear-gradient(${useAngle ? `${angle}deg` : direction}, ${positionedStops})`
  })()

  const cycleGradientType = () => {
    const i = GRADIENT_TYPES.indexOf(gradientType)
    setGradientType(GRADIENT_TYPES[(i + 1) % GRADIENT_TYPES.length])
  }

  const cycleDirection = () => {
    const i = DIRECTIONS.indexOf(direction)
    setDirection(DIRECTIONS[(i + 1) % DIRECTIONS.length])
  }

  const cycleAngle = () => {
    const i = ANGLE_OPTIONS.indexOf(angle)
    setAngle(ANGLE_OPTIONS[(i + 1) % ANGLE_OPTIONS.length])
  }

  return (
    <ScreenLayout
      title="Gradient Backgrounds"
      description="Test CSS gradient strings as backgroundImage on Android Voltra widget views."
    >
      <Card>
        <Card.Title>Controls</Card.Title>

        <View style={styles.controlRow}>
          <Text style={styles.controlLabel}>Type:</Text>
          <Button title={gradientType} onPress={cycleGradientType} variant="secondary" />
        </View>

        {gradientType === 'linear' && (
          <>
            <View style={styles.controlRow}>
              <Text style={styles.controlLabel}>Mode:</Text>
              <Button
                title={useAngle ? 'angle' : 'direction'}
                onPress={() => setUseAngle((value) => !value)}
                variant="secondary"
              />
            </View>
            {useAngle ? (
              <View style={styles.controlRow}>
                <Text style={styles.controlLabel}>Angle: {angle}deg</Text>
                <Button title="cycle" onPress={cycleAngle} variant="secondary" />
              </View>
            ) : (
              <View style={styles.controlRow}>
                <Text style={styles.controlLabel}>Direction:</Text>
                <Button title={direction} onPress={cycleDirection} variant="secondary" />
              </View>
            )}
          </>
        )}

        {gradientType === 'conic' && (
          <View style={styles.controlRow}>
            <Text style={styles.controlLabel}>Start angle: {angle}deg</Text>
            <Button title="cycle" onPress={cycleAngle} variant="secondary" />
          </View>
        )}

        <View style={styles.controlRow}>
          <Text style={styles.controlLabel}>Colors: {PRESETS[preset].label}</Text>
          <Button
            title="cycle"
            onPress={() => setPreset((value) => (value + 1) % PRESETS.length)}
            variant="secondary"
          />
        </View>

        <View style={styles.controlRow}>
          <Text style={styles.controlLabel}>borderRadius: {borderRadius}px</Text>
          <View style={styles.buttonGroup}>
            <Button title="-" onPress={() => setBorderRadius((value) => Math.max(value - 8, 0))} variant="secondary" />
            <Button title="+" onPress={() => setBorderRadius((value) => Math.min(value + 8, 80))} variant="secondary" />
          </View>
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.scrollArea}>
          <View style={styles.familyRow}>
            {ANDROID_WIDGET_FAMILIES.map((family) => (
              <Button
                key={family.id}
                title={family.title}
                variant={selectedFamily === family.id ? 'primary' : 'secondary'}
                onPress={() => setSelectedFamily(family.id)}
                style={styles.familyButton}
              />
            ))}
          </View>
        </ScrollView>
      </Card>

      <Card>
        <Card.Title>Live Preview</Card.Title>
        <Text style={styles.previewSubtext}>{gradient}</Text>

        <WidgetPreview family={selectedFamily}>
          <VoltraAndroid.Scaffold backgroundColor="#0F172A">
            <VoltraAndroid.Box
              style={{
                width: '100%',
                height: '100%',
                padding: 16,
              }}
              contentAlignment="center"
            >
              <VoltraAndroid.Box
                style={{
                  width: '100%',
                  height: '100%',
                  backgroundColor: '#0F172A',
                  backgroundImage: gradient,
                  borderRadius,
                  padding: 16,
                }}
                contentAlignment="center"
              >
                <VoltraAndroid.Column horizontalAlignment="center-horizontally" verticalAlignment="center-vertically">
                  <VoltraAndroid.Text style={{ color: '#FFFFFF', fontSize: 16, fontWeight: '700' }}>
                    Gradient View
                  </VoltraAndroid.Text>
                  <VoltraAndroid.Spacer style={{ height: 6 }} />
                  <VoltraAndroid.Text style={{ color: 'rgba(255,255,255,0.75)', fontSize: 11, textAlign: 'center' }}>
                    {gradient}
                  </VoltraAndroid.Text>
                </VoltraAndroid.Column>
              </VoltraAndroid.Box>
            </VoltraAndroid.Box>
          </VoltraAndroid.Scaffold>
        </WidgetPreview>
      </Card>

      <Card>
        <Card.Title>Color Stop Positions</Card.Title>
        <Text style={styles.previewSubtext}>Explicit percentage stops: red 10%, yellow 50%, blue 90%</Text>

        <WidgetPreview>
          <VoltraAndroid.Box style={styles.sampleRoot}>
            <VoltraAndroid.Box
              style={{
                width: '100%',
                height: 72,
                backgroundImage: 'linear-gradient(to right, red 10%, yellow 50%, blue 90%)',
                borderRadius: 8,
              }}
            />
          </VoltraAndroid.Box>
        </WidgetPreview>
      </Card>

      <Card>
        <Card.Title>Transparent Stops</Card.Title>
        <Text style={styles.previewSubtext}>
          Transparent gradient pixels should show the backgroundColor layer behind them.
        </Text>

        <WidgetPreview>
          <VoltraAndroid.Box style={styles.sampleRoot}>
            <VoltraAndroid.Box
              style={{
                width: '100%',
                height: 72,
                backgroundColor: '#0F172A',
                backgroundImage: 'linear-gradient(to right, rgba(255,0,0,0.8) 0%, transparent 100%)',
                borderRadius: 8,
              }}
            />
          </VoltraAndroid.Box>
        </WidgetPreview>
      </Card>

      <Card>
        <Card.Title>Solid Color (Unchanged)</Card.Title>
        <Text style={styles.previewSubtext}>backgroundColor: "#3B82F6" - plain colors still work</Text>

        <WidgetPreview>
          <VoltraAndroid.Box style={styles.sampleRoot}>
            <VoltraAndroid.Box
              style={{
                width: '100%',
                height: 72,
                backgroundColor: '#3B82F6',
                borderRadius: 8,
              }}
              contentAlignment="center"
            >
              <VoltraAndroid.Text style={{ color: '#FFFFFF', fontSize: 12 }}>Solid #3B82F6</VoltraAndroid.Text>
            </VoltraAndroid.Box>
          </VoltraAndroid.Box>
        </WidgetPreview>
      </Card>

      <View style={styles.footer}>
        <Button title="Back to Android Home" variant="ghost" onPress={() => router.back()} />
      </View>
    </ScreenLayout>
  )
}

const styles = StyleSheet.create({
  controlRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  controlLabel: {
    fontSize: 14,
    color: '#CBD5F5',
    flex: 1,
  },
  buttonGroup: {
    flexDirection: 'row',
    gap: 8,
  },
  scrollArea: {
    marginHorizontal: -4,
  },
  familyRow: {
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 4,
    marginTop: 8,
  },
  familyButton: {
    minWidth: 92,
  },
  previewContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    marginTop: 12,
    backgroundColor: '#0F172A',
    borderRadius: 12,
  },
  widgetBorder: {
    borderRadius: 24,
    overflow: 'hidden',
  },
  sampleRoot: {
    width: '100%',
    height: '100%',
    backgroundColor: '#0F172A',
    padding: 16,
  },
  previewSubtext: {
    fontSize: 12,
    color: '#94A3B8',
    marginTop: 4,
  },
  footer: {
    marginTop: 24,
    alignItems: 'center',
  },
})
