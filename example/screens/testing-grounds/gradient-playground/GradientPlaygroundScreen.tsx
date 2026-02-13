import { Link } from 'expo-router'
import React, { useState } from 'react'
import { ScrollView, StyleSheet, Text, View } from 'react-native'
import { Voltra } from 'voltra'
import { VoltraView } from 'voltra/client'

import { Button } from '~/components/Button'
import { Card } from '~/components/Card'

type GradientType = 'linear' | 'radial' | 'conic'
type Direction = 'to right' | 'to bottom' | 'to bottom right' | 'to top right'

const GRADIENT_TYPES: GradientType[] = ['linear', 'radial', 'conic']
const DIRECTIONS: Direction[] = ['to right', 'to bottom', 'to bottom right', 'to top right']
const DIRECTION_LABELS: Record<Direction, string> = {
  'to right': 'to right',
  'to bottom': 'to bottom',
  'to bottom right': 'to bottom right',
  'to top right': 'to top right',
}

const PRESETS: Array<{ label: string; colors: [string, string, ...string[]] }> = [
  { label: 'Sunset', colors: ['#FF6B6B', '#FFD93D'] },
  { label: 'Ocean', colors: ['#0093E9', '#80D0C7'] },
  { label: 'Purple', colors: ['#8B5CF6', '#EC4899'] },
  { label: 'Tri-color', colors: ['#EF4444', '#10B981', '#3B82F6'] },
]

const ANGLE_OPTIONS = [0, 45, 90, 135, 180]

export default function GradientPlaygroundScreen() {
  const [gradientType, setGradientType] = useState<GradientType>('linear')
  const [direction, setDirection] = useState<Direction>('to right')
  const [angle, setAngle] = useState(90)
  const [useAngle, setUseAngle] = useState(false)
  const [preset, setPreset] = useState(0)
  const [borderRadius, setBorderRadius] = useState(12)

  const colors = PRESETS[preset].colors

  const buildGradient = (): string => {
    if (gradientType === 'radial') {
      return `radial-gradient(${colors.join(', ')})`
    }
    if (gradientType === 'conic') {
      return `conic-gradient(from ${angle}deg, ${colors.join(', ')})`
    }
    // linear
    const dir = useAngle ? `${angle}deg` : direction
    return `linear-gradient(${dir}, ${colors.join(', ')})`
  }

  const gradient = buildGradient()

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

  const cyclePreset = () => {
    setPreset((prev) => (prev + 1) % PRESETS.length)
  }

  const increaseBorderRadius = () => setBorderRadius((prev) => Math.min(prev + 8, 80))
  const decreaseBorderRadius = () => setBorderRadius((prev) => Math.max(prev - 8, 0))

  return (
    <View style={styles.container}>
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.content}>
        <Text style={styles.heading}>Gradient Playground</Text>
        <Text style={styles.subheading}>Test CSS gradient strings as backgroundColor on Voltra views.</Text>

        {/* Controls */}
        <Card>
          <Card.Title>Controls</Card.Title>

          {/* Gradient Type */}
          <View style={styles.controlRow}>
            <Text style={styles.controlLabel}>Type:</Text>
            <Button title={gradientType} onPress={cycleGradientType} variant="secondary" />
          </View>

          {/* Direction (linear only) */}
          {gradientType === 'linear' && (
            <>
              <View style={styles.controlRow}>
                <Text style={styles.controlLabel}>Mode:</Text>
                <Button
                  title={useAngle ? 'angle' : 'direction'}
                  onPress={() => setUseAngle((v) => !v)}
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
                  <Button title={DIRECTION_LABELS[direction]} onPress={cycleDirection} variant="secondary" />
                </View>
              )}
            </>
          )}

          {/* Angle for conic */}
          {gradientType === 'conic' && (
            <View style={styles.controlRow}>
              <Text style={styles.controlLabel}>Start angle: {angle}deg</Text>
              <Button title="cycle" onPress={cycleAngle} variant="secondary" />
            </View>
          )}

          {/* Color Preset */}
          <View style={styles.controlRow}>
            <Text style={styles.controlLabel}>Colors: {PRESETS[preset].label}</Text>
            <Button title="cycle" onPress={cyclePreset} variant="secondary" />
          </View>

          {/* Border Radius */}
          <View style={styles.controlRow}>
            <Text style={styles.controlLabel}>borderRadius: {borderRadius}px</Text>
            <View style={styles.buttonGroup}>
              <Button title="-" onPress={decreaseBorderRadius} variant="secondary" />
              <Button title="+" onPress={increaseBorderRadius} variant="secondary" />
            </View>
          </View>
        </Card>

        {/* Live Preview */}
        <Card>
          <Card.Title>Live Preview</Card.Title>

          <VoltraView style={{ width: '100%', height: 220, backgroundColor: '#0F172A', padding: 16, marginTop: 12 }}>
            <Voltra.View
              style={{
                flex: 1,
                backgroundColor: gradient,
                borderRadius,
                width: '100%',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Voltra.Text style={{ color: '#FFFFFF', fontSize: 16, fontWeight: 'bold' }}>Gradient View</Voltra.Text>
              <Voltra.Text style={{ color: 'rgba(255,255,255,0.75)', fontSize: 11 }}>{gradient}</Voltra.Text>
            </Voltra.View>
          </VoltraView>
        </Card>

        {/* Explicit stop positions */}
        <Card>
          <Card.Title>Color Stop Positions</Card.Title>
          <Text style={styles.previewSubtext}>Explicit percentage stops: red 10%, yellow 50%, blue 90%</Text>

          <VoltraView style={{ width: '100%', height: 80, backgroundColor: '#0F172A', padding: 16, marginTop: 12 }}>
            <Voltra.View
              style={{
                flex: 1,
                backgroundColor: 'linear-gradient(to right, red 10%, yellow 50%, blue 90%)',
                borderRadius: 8,
                width: '100%',
              }}
            />
          </VoltraView>
        </Card>

        {/* rgba inside gradient */}
        <Card>
          <Card.Title>RGBA Inside Gradient</Card.Title>
          <Text style={styles.previewSubtext}>linear-gradient(to right, rgba(255,0,0,0.8), rgba(0,0,255,0.3))</Text>

          <VoltraView style={{ width: '100%', height: 80, backgroundColor: '#0F172A', padding: 16, marginTop: 12 }}>
            <Voltra.View
              style={{
                flex: 1,
                backgroundColor: 'linear-gradient(to right, rgba(255,0,0,0.8), rgba(0,0,255,0.3))',
                borderRadius: 8,
                width: '100%',
              }}
            />
          </VoltraView>
        </Card>

        {/* Solid color still works */}
        <Card>
          <Card.Title>Solid Color (Unchanged)</Card.Title>
          <Text style={styles.previewSubtext}>backgroundColor: "#3B82F6" — plain colors still work</Text>

          <VoltraView style={{ width: '100%', height: 80, backgroundColor: '#0F172A', padding: 16, marginTop: 12 }}>
            <Voltra.View
              style={{
                flex: 1,
                backgroundColor: '#3B82F6',
                borderRadius: 8,
                width: '100%',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Voltra.Text style={{ color: '#FFFFFF', fontSize: 12 }}>Solid #3B82F6</Voltra.Text>
            </Voltra.View>
          </VoltraView>
        </Card>

        <View style={styles.footer}>
          <Link href="/testing-grounds" asChild>
            <Button title="Back to Testing Grounds" variant="ghost" />
          </Link>
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
    marginBottom: 20,
  },
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
