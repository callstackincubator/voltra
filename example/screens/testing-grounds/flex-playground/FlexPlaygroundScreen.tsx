import { Link } from 'expo-router'
import React, { useState } from 'react'
import { ScrollView, StyleSheet, Text, View } from 'react-native'
import { Voltra } from 'voltra'
import { VoltraView } from 'voltra/client'

import { Button } from '~/components/Button'
import { Card } from '~/components/Card'

type FlexDirection = 'row' | 'column'
type AlignItems = 'flex-start' | 'center' | 'flex-end' | 'stretch'
type JustifyContent = 'flex-start' | 'center' | 'flex-end' | 'space-between' | 'space-around' | 'space-evenly'

const FLEX_DIRECTION_OPTIONS: FlexDirection[] = ['column', 'row']
const ALIGN_ITEMS_OPTIONS: AlignItems[] = ['flex-start', 'center', 'flex-end', 'stretch']
const JUSTIFY_CONTENT_OPTIONS: JustifyContent[] = [
  'flex-start',
  'center',
  'flex-end',
  'space-between',
  'space-around',
  'space-evenly',
]

const FLEX_DIRECTION_LABELS: Record<FlexDirection, string> = {
  column: 'Column',
  row: 'Row',
}

const ALIGN_ITEMS_LABELS: Record<AlignItems, string> = {
  'flex-start': 'flex-start',
  center: 'center',
  'flex-end': 'flex-end',
  stretch: 'stretch',
}

const JUSTIFY_CONTENT_LABELS: Record<JustifyContent, string> = {
  'flex-start': 'flex-start',
  center: 'center',
  'flex-end': 'flex-end',
  'space-between': 'space-between',
  'space-around': 'space-around',
  'space-evenly': 'space-evenly',
}

export default function FlexPlaygroundScreen() {
  const [flexDirection, setFlexDirection] = useState<FlexDirection>('column')
  const [alignItems, setAlignItems] = useState<AlignItems>('stretch')
  const [justifyContent, setJustifyContent] = useState<JustifyContent>('flex-start')
  const [gap, setGap] = useState<number>(8)
  const [containerPadding, setContainerPadding] = useState<number>(16)

  const cycleFlexDirection = () => {
    const currentIndex = FLEX_DIRECTION_OPTIONS.indexOf(flexDirection)
    const nextIndex = (currentIndex + 1) % FLEX_DIRECTION_OPTIONS.length
    setFlexDirection(FLEX_DIRECTION_OPTIONS[nextIndex])
  }

  const cycleAlignItems = () => {
    const currentIndex = ALIGN_ITEMS_OPTIONS.indexOf(alignItems)
    const nextIndex = (currentIndex + 1) % ALIGN_ITEMS_OPTIONS.length
    setAlignItems(ALIGN_ITEMS_OPTIONS[nextIndex])
  }

  const cycleJustifyContent = () => {
    const currentIndex = JUSTIFY_CONTENT_OPTIONS.indexOf(justifyContent)
    const nextIndex = (currentIndex + 1) % JUSTIFY_CONTENT_OPTIONS.length
    setJustifyContent(JUSTIFY_CONTENT_OPTIONS[nextIndex])
  }

  const increaseGap = () => setGap((prev) => Math.min(prev + 4, 32))
  const decreaseGap = () => setGap((prev) => Math.max(prev - 4, 0))

  const increasePadding = () => setContainerPadding((prev) => Math.min(prev + 4, 32))
  const decreasePadding = () => setContainerPadding((prev) => Math.max(prev - 4, 0))

  return (
    <View style={styles.container}>
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.content}>
        <Text style={styles.heading}>Flex Layout Playground</Text>
        <Text style={styles.subheading}>
          Experiment with flex properties using the new View component with dynamic flexDirection.
        </Text>

        {/* Controls */}
        <Card>
          <Card.Title>Controls</Card.Title>

          {/* Flex Direction */}
          <View style={styles.controlRow}>
            <Text style={styles.controlLabel}>Flex Direction:</Text>
            <Button title={FLEX_DIRECTION_LABELS[flexDirection]} onPress={cycleFlexDirection} variant="secondary" />
          </View>

          {/* Align Items */}
          <View style={styles.controlRow}>
            <Text style={styles.controlLabel}>Align Items:</Text>
            <Button title={ALIGN_ITEMS_LABELS[alignItems]} onPress={cycleAlignItems} variant="secondary" />
          </View>

          {/* Justify Content */}
          <View style={styles.controlRow}>
            <Text style={styles.controlLabel}>Justify Content:</Text>
            <Button title={JUSTIFY_CONTENT_LABELS[justifyContent]} onPress={cycleJustifyContent} variant="secondary" />
          </View>

          {/* Gap */}
          <View style={styles.controlRow}>
            <Text style={styles.controlLabel}>Gap: {gap}px</Text>
            <View style={styles.buttonGroup}>
              <Button title="-" onPress={decreaseGap} variant="secondary" />
              <Button title="+" onPress={increaseGap} variant="secondary" />
            </View>
          </View>

          {/* Container Padding */}
          <View style={styles.controlRow}>
            <Text style={styles.controlLabel}>Padding: {containerPadding}px</Text>
            <View style={styles.buttonGroup}>
              <Button title="-" onPress={decreasePadding} variant="secondary" />
              <Button title="+" onPress={increasePadding} variant="secondary" />
            </View>
          </View>
        </Card>

        {/* Preview */}
        <Card>
          <Card.Title>Live Preview</Card.Title>
          <Text style={styles.previewSubtext}>See how your flex settings affect the layout below</Text>

          <VoltraView style={{ width: '100%', height: 300, backgroundColor: '#1E293B', padding: 8, marginTop: 12 }}>
            <Voltra.View
              style={{
                backgroundColor: '#334155',
                padding: containerPadding,
                width: '100%',
                height: '100%',
                flexDirection,
                alignItems,
                justifyContent,
                gap,
              }}
            >
              <Voltra.View
                style={{
                  backgroundColor: '#EF4444',
                  padding: 12,
                  borderRadius: 8,
                  width: flexDirection === 'row' ? 80 : undefined,
                  height: flexDirection === 'column' ? 60 : undefined,
                }}
              >
                <Voltra.Text style={{ color: '#FFFFFF', fontSize: 12, fontWeight: 'bold' }}>Item 1</Voltra.Text>
              </Voltra.View>

              <Voltra.View
                style={{
                  backgroundColor: '#3B82F6',
                  padding: 12,
                  borderRadius: 8,
                  width: flexDirection === 'row' ? 100 : undefined,
                  height: flexDirection === 'column' ? 80 : undefined,
                }}
              >
                <Voltra.Text style={{ color: '#FFFFFF', fontSize: 12, fontWeight: 'bold' }}>Item 2</Voltra.Text>
              </Voltra.View>

              <Voltra.View
                style={{
                  backgroundColor: '#10B981',
                  padding: 12,
                  borderRadius: 8,
                  width: flexDirection === 'row' ? 60 : undefined,
                  height: flexDirection === 'column' ? 50 : undefined,
                }}
              >
                <Voltra.Text style={{ color: '#FFFFFF', fontSize: 12, fontWeight: 'bold' }}>Item 3</Voltra.Text>
              </Voltra.View>
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
