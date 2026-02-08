import { Link } from 'expo-router'
import React, { useState } from 'react'
import { ScrollView, StyleSheet, Text, View } from 'react-native'
import { Voltra } from 'voltra'
import { VoltraView } from 'voltra/client'

import { Button } from '~/components/Button'
import { Card } from '~/components/Card'

type FlexDirection = 'horizontal' | 'vertical'
type AlignItems = 'flexStart' | 'center' | 'flexEnd' | 'stretch'
type JustifyContent = 'flexStart' | 'center' | 'flexEnd' | 'spaceBetween' | 'spaceAround' | 'spaceEvenly'

const ALIGN_ITEMS_OPTIONS: AlignItems[] = ['flexStart', 'center', 'flexEnd', 'stretch']
const JUSTIFY_CONTENT_OPTIONS: JustifyContent[] = [
  'flexStart',
  'center',
  'flexEnd',
  'spaceBetween',
  'spaceAround',
  'spaceEvenly',
]

const ALIGN_ITEMS_LABELS: Record<AlignItems, string> = {
  flexStart: 'flex-start',
  center: 'center',
  flexEnd: 'flex-end',
  stretch: 'stretch',
}

const JUSTIFY_CONTENT_LABELS: Record<JustifyContent, string> = {
  flexStart: 'flex-start',
  center: 'center',
  flexEnd: 'flex-end',
  spaceBetween: 'space-between',
  spaceAround: 'space-around',
  spaceEvenly: 'space-evenly',
}

export default function FlexPlaygroundScreen() {
  const [flexDirection, setFlexDirection] = useState<FlexDirection>('vertical')
  const [alignItems, setAlignItems] = useState<AlignItems>('stretch')
  const [justifyContent, setJustifyContent] = useState<JustifyContent>('flexStart')
  const [spacing, setSpacing] = useState<number>(8)
  const [containerPadding, setContainerPadding] = useState<number>(16)

  const toggleFlexDirection = () => {
    setFlexDirection((prev) => (prev === 'vertical' ? 'horizontal' : 'vertical'))
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

  const increaseSpacing = () => setSpacing((prev) => Math.min(prev + 4, 32))
  const decreaseSpacing = () => setSpacing((prev) => Math.max(prev - 4, 0))

  const increasePadding = () => setContainerPadding((prev) => Math.min(prev + 4, 32))
  const decreasePadding = () => setContainerPadding((prev) => Math.max(prev - 4, 0))

  const StackComponent = flexDirection === 'vertical' ? Voltra.VStack : Voltra.HStack

  return (
    <View style={styles.container}>
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.content}>
        <Text style={styles.heading}>Flex Layout Playground</Text>
        <Text style={styles.subheading}>
          Experiment with flex properties to understand how they affect layout in Voltra components.
        </Text>

        {/* Controls */}
        <Card>
          <Card.Title>Controls</Card.Title>

          {/* Flex Direction */}
          <View style={styles.controlRow}>
            <Text style={styles.controlLabel}>Flex Direction:</Text>
            <Button
              title={flexDirection === 'vertical' ? 'Vertical' : 'Horizontal'}
              onPress={toggleFlexDirection}
              variant="secondary"
            />
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

          {/* Spacing */}
          <View style={styles.controlRow}>
            <Text style={styles.controlLabel}>Spacing: {spacing}px</Text>
            <View style={styles.buttonGroup}>
              <Button title="-" onPress={decreaseSpacing} variant="secondary" />
              <Button title="+" onPress={increaseSpacing} variant="secondary" />
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
            <StackComponent
              layout="flex"
              spacing={spacing}
              style={{
                backgroundColor: '#334155',
                padding: containerPadding,
                width: '100%',
                height: '100%',
                alignItems,
                justifyContent,
              }}
            >
              <Voltra.VStack
                style={{
                  backgroundColor: '#EF4444',
                  padding: 12,
                  borderRadius: 8,
                  width: flexDirection === 'horizontal' ? 80 : undefined,
                  height: flexDirection === 'vertical' ? 60 : undefined,
                }}
              >
                <Voltra.Text style={{ color: '#FFFFFF', fontSize: 12, fontWeight: 'bold' }}>Item 1</Voltra.Text>
              </Voltra.VStack>

              <Voltra.VStack
                style={{
                  backgroundColor: '#3B82F6',
                  padding: 12,
                  borderRadius: 8,
                  width: flexDirection === 'horizontal' ? 100 : undefined,
                  height: flexDirection === 'vertical' ? 80 : undefined,
                }}
              >
                <Voltra.Text style={{ color: '#FFFFFF', fontSize: 12, fontWeight: 'bold' }}>Item 2</Voltra.Text>
              </Voltra.VStack>

              <Voltra.VStack
                style={{
                  backgroundColor: '#10B981',
                  padding: 12,
                  borderRadius: 8,
                  width: flexDirection === 'horizontal' ? 60 : undefined,
                  height: flexDirection === 'vertical' ? 50 : undefined,
                }}
              >
                <Voltra.Text style={{ color: '#FFFFFF', fontSize: 12, fontWeight: 'bold' }}>Item 3</Voltra.Text>
              </Voltra.VStack>
            </StackComponent>
          </VoltraView>
        </Card>

        {/* Flex Properties Explanation */}
        <Card>
          <Card.Title>Understanding Flex Properties</Card.Title>

          <View style={styles.explanation}>
            <Text style={styles.explanationTitle}>flexDirection</Text>
            <Text style={styles.explanationText}>
              Defines the main axis direction. &apos;vertical&apos; stacks children top to bottom,
              &apos;horizontal&apos; arranges them left to right.
            </Text>
          </View>

          <View style={styles.explanation}>
            <Text style={styles.explanationTitle}>alignItems</Text>
            <Text style={styles.explanationText}>
              Aligns children along the cross axis (perpendicular to main axis). Options: flex-start, center, flex-end,
              stretch.
            </Text>
          </View>

          <View style={styles.explanation}>
            <Text style={styles.explanationTitle}>justifyContent</Text>
            <Text style={styles.explanationText}>
              Distributes children along the main axis. Options: flex-start, center, flex-end, space-between,
              space-around, space-evenly.
            </Text>
          </View>

          <View style={styles.explanation}>
            <Text style={styles.explanationTitle}>spacing</Text>
            <Text style={styles.explanationText}>Sets the gap between children in the flex container.</Text>
          </View>

          <View style={styles.explanation}>
            <Text style={styles.explanationTitle}>padding</Text>
            <Text style={styles.explanationText}>
              Adds space inside the container, between the container edges and its children.
            </Text>
          </View>
        </Card>

        {/* Advanced Examples */}
        <Card>
          <Card.Title>Common Patterns</Card.Title>

          <View style={styles.pattern}>
            <Text style={styles.patternTitle}>Centered Content</Text>
            <VoltraView style={{ width: '100%', height: 120, backgroundColor: '#1E293B', padding: 8, marginTop: 8 }}>
              <Voltra.VStack
                layout="flex"
                style={{
                  backgroundColor: '#334155',
                  padding: 16,
                  width: '100%',
                  height: '100%',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Voltra.VStack style={{ backgroundColor: '#8B5CF6', padding: 16, borderRadius: 8 }}>
                  <Voltra.Text style={{ color: '#FFFFFF' }}>Centered</Voltra.Text>
                </Voltra.VStack>
              </Voltra.VStack>
            </VoltraView>
          </View>

          <View style={styles.pattern}>
            <Text style={styles.patternTitle}>Space Between Navigation</Text>
            <VoltraView style={{ width: '100%', height: 80, backgroundColor: '#1E293B', padding: 8, marginTop: 8 }}>
              <Voltra.HStack
                layout="flex"
                style={{
                  backgroundColor: '#334155',
                  padding: 12,
                  width: '100%',
                  height: '100%',
                  alignItems: 'center',
                  justifyContent: 'spaceBetween',
                }}
              >
                <Voltra.VStack style={{ backgroundColor: '#EC4899', padding: 8, borderRadius: 4 }}>
                  <Voltra.Text style={{ color: '#FFFFFF', fontSize: 10 }}>Back</Voltra.Text>
                </Voltra.VStack>
                <Voltra.VStack style={{ backgroundColor: '#EC4899', padding: 8, borderRadius: 4 }}>
                  <Voltra.Text style={{ color: '#FFFFFF', fontSize: 10 }}>Title</Voltra.Text>
                </Voltra.VStack>
                <Voltra.VStack style={{ backgroundColor: '#EC4899', padding: 8, borderRadius: 4 }}>
                  <Voltra.Text style={{ color: '#FFFFFF', fontSize: 10 }}>Menu</Voltra.Text>
                </Voltra.VStack>
              </Voltra.HStack>
            </VoltraView>
          </View>

          <View style={styles.pattern}>
            <Text style={styles.patternTitle}>Evenly Spaced Row</Text>
            <VoltraView style={{ width: '100%', height: 80, backgroundColor: '#1E293B', padding: 8, marginTop: 8 }}>
              <Voltra.HStack
                layout="flex"
                style={{
                  backgroundColor: '#334155',
                  padding: 12,
                  width: '100%',
                  height: '100%',
                  alignItems: 'center',
                  justifyContent: 'spaceEvenly',
                }}
              >
                <Voltra.VStack style={{ backgroundColor: '#F59E0B', padding: 8, borderRadius: 4 }}>
                  <Voltra.Text style={{ color: '#FFFFFF', fontSize: 10 }}>A</Voltra.Text>
                </Voltra.VStack>
                <Voltra.VStack style={{ backgroundColor: '#F59E0B', padding: 8, borderRadius: 4 }}>
                  <Voltra.Text style={{ color: '#FFFFFF', fontSize: 10 }}>B</Voltra.Text>
                </Voltra.VStack>
                <Voltra.VStack style={{ backgroundColor: '#F59E0B', padding: 8, borderRadius: 4 }}>
                  <Voltra.Text style={{ color: '#FFFFFF', fontSize: 10 }}>C</Voltra.Text>
                </Voltra.VStack>
              </Voltra.HStack>
            </VoltraView>
          </View>
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
  explanation: {
    marginBottom: 16,
  },
  explanationTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  explanationText: {
    fontSize: 13,
    lineHeight: 18,
    color: '#CBD5F5',
  },
  pattern: {
    marginBottom: 16,
  },
  patternTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  footer: {
    marginTop: 24,
    alignItems: 'center',
  },
})
