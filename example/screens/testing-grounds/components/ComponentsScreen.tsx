import { Link } from 'expo-router'
import React from 'react'
import { FlatList, StyleSheet, Text, View } from 'react-native'
import { Voltra } from 'voltra'
import { VoltraView } from 'voltra/client'

import { Button } from '~/components/Button'
import { Card } from '~/components/Card'

const IMAGE =
  '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'

const COMPONENTS_DATA = [
  {
    id: 'button',
    title: 'Button',
    description: 'An interactive button component for user actions.',
    renderExample: () => (
      <VoltraView style={{ width: '100%', height: 80, backgroundColor: '#1E293B', padding: 16 }}>
        <Voltra.Button id="primary-button">
          <Voltra.Text>Primary Button</Voltra.Text>
        </Voltra.Button>
      </VoltraView>
    ),
  },
  {
    id: 'text',
    title: 'Text',
    description: 'Basic text component with styling capabilities.',
    renderExample: () => (
      <VoltraView style={{ width: '100%', height: 100, backgroundColor: '#1E293B', padding: 16 }}>
        <Voltra.VStack>
          <Voltra.Text style={{ color: '#FFFFFF', fontSize: 16 }}>Hello World</Voltra.Text>
          <Voltra.Text style={{ color: '#3B82F6', fontSize: 14, fontWeight: 'bold' }}>Styled Text</Voltra.Text>
        </Voltra.VStack>
      </VoltraView>
    ),
  },
  {
    id: 'vstack',
    title: 'VStack',
    description: 'Vertical stack layout component for arranging elements vertically.',
    renderExample: () => (
      <VoltraView style={{ width: '100%', height: 120, backgroundColor: '#1E293B', padding: 16 }}>
        <Voltra.VStack style={{ backgroundColor: '#334155', padding: 12 }}>
          <Voltra.Text>Item 1</Voltra.Text>
          <Voltra.Text>Item 2</Voltra.Text>
          <Voltra.Text>Item 3</Voltra.Text>
        </Voltra.VStack>
      </VoltraView>
    ),
  },
  {
    id: 'hstack',
    title: 'HStack',
    description: 'Horizontal stack layout component for arranging elements horizontally.',
    renderExample: () => (
      <VoltraView style={{ width: '100%', height: 80, backgroundColor: '#1E293B', padding: 16 }}>
        <Voltra.HStack style={{ backgroundColor: '#334155', padding: 12 }}>
          <Voltra.Text>Left</Voltra.Text>
          <Voltra.Text>Center</Voltra.Text>
          <Voltra.Text>Right</Voltra.Text>
        </Voltra.HStack>
      </VoltraView>
    ),
  },
  {
    id: 'zstack',
    title: 'ZStack',
    description: 'Z-axis stack component for layering elements on top of each other.',
    renderExample: () => (
      <VoltraView style={{ width: '100%', height: 100, backgroundColor: '#1E293B', padding: 16 }}>
        <Voltra.ZStack style={{ width: '100%', height: 60 }}>
          <Voltra.VStack style={{ backgroundColor: '#DC2626', flex: 1, opacity: 0.8 }}>
            <Voltra.Text>Background</Voltra.Text>
          </Voltra.VStack>
          <Voltra.VStack style={{ backgroundColor: '#2563EB', width: 120, height: 40, offsetX: 20, offsetY: 10 }}>
            <Voltra.Text>Overlay</Voltra.Text>
          </Voltra.VStack>
        </Voltra.ZStack>
      </VoltraView>
    ),
  },
  {
    id: 'spacer',
    title: 'Spacer',
    description: 'Flexible spacer component for creating gaps between elements.',
    renderExample: () => (
      <VoltraView style={{ height: 100, backgroundColor: '#1E293B', padding: 16 }}>
        <Voltra.VStack style={{ backgroundColor: '#334155', padding: 12, height: 100 }}>
          <Voltra.Text>Top Item</Voltra.Text>
          <Voltra.Spacer />
          <Voltra.Text>Bottom Item</Voltra.Text>
        </Voltra.VStack>
      </VoltraView>
    ),
  },
  {
    id: 'divider',
    title: 'Divider',
    description: 'Visual separator component for dividing content sections.',
    renderExample: () => (
      <VoltraView style={{ width: '100%', height: 100, backgroundColor: '#1E293B', padding: 16 }}>
        <Voltra.VStack style={{ backgroundColor: '#334155', padding: 12 }}>
          <Voltra.Text>Section 1</Voltra.Text>
          <Voltra.Divider style={{ marginVertical: 8 }} />
          <Voltra.Text>Section 2</Voltra.Text>
        </Voltra.VStack>
      </VoltraView>
    ),
  },
  {
    id: 'image',
    title: 'Image',
    description: 'Component for displaying images with various sources and styling.',
    renderExample: () => (
      <VoltraView style={{ width: '100%', height: 200, backgroundColor: '#1E293B', padding: 16 }}>
        <Voltra.VStack style={{ backgroundColor: '#334155', padding: 12 }} alignment="center">
          <Voltra.Image source={{ base64: IMAGE }} style={{ width: 50, height: 50, borderRadius: 8 }} />
        </Voltra.VStack>
      </VoltraView>
    ),
  },
  {
    id: 'label',
    title: 'Label',
    description: 'Styled label component for displaying text with consistent formatting.',
    renderExample: () => (
      <VoltraView style={{ width: '100%', height: 80, backgroundColor: '#1E293B', padding: 16 }}>
        <Voltra.VStack style={{ backgroundColor: '#334155', padding: 12 }}>
          <Voltra.Label title="Primary Label" systemImage="star.fill" style={{ color: '#FFFFFF' }} />
        </Voltra.VStack>
      </VoltraView>
    ),
  },
  {
    id: 'toggle',
    title: 'Toggle',
    description: 'Interactive toggle switch component for boolean states.',
    renderExample: () => (
      <VoltraView style={{ width: '100%', height: 80, backgroundColor: '#1E293B', padding: 16 }}>
        <Voltra.VStack style={{ backgroundColor: '#334155', padding: 12 }} alignment="center">
          <Voltra.Toggle defaultValue={true} />
        </Voltra.VStack>
      </VoltraView>
    ),
  },
  {
    id: 'progress',
    title: 'Progress Components',
    description: 'Linear and circular progress indicators for showing completion states.',
    renderExample: () => (
      <VoltraView style={{ width: '100%', height: 120, backgroundColor: '#1E293B', padding: 16 }}>
        <Voltra.VStack style={{ backgroundColor: '#334155', padding: 12 }}>
          <Voltra.LinearProgressView value={50} progressColor="#8232FF" />
          <Voltra.CircularProgressView value={50} progressColor="#8232FF" />
        </Voltra.VStack>
      </VoltraView>
    ),
  },
  {
    id: 'gauge',
    title: 'Gauge',
    description: 'Circular gauge component for displaying values within a range.',
    renderExample: () => (
      <VoltraView style={{ width: '100%', height: 120, backgroundColor: '#1E293B', padding: 16 }}>
        <Voltra.VStack style={{ backgroundColor: '#334155', padding: 12 }}>
          <Voltra.Gauge
            minimumValue={0}
            value={50}
            maximumValue={100}
            tintColor="#8232FF"
            gaugeStyle="accessoryLinearCapacity"
            currentValueLabel={<Voltra.Text>50/100</Voltra.Text>}
            minimumValueLabel={<Voltra.Text>01234</Voltra.Text>}
            maximumValueLabel={<Voltra.Text>12345</Voltra.Text>}
          />
        </Voltra.VStack>
      </VoltraView>
    ),
  },
  {
    id: 'timer',
    title: 'Timer',
    description: 'Countdown timer component for displaying remaining time.',
    renderExample: () => (
      <VoltraView style={{ width: '100%', height: 80, backgroundColor: '#1E293B', padding: 16 }}>
        <Voltra.VStack style={{ backgroundColor: '#334155', padding: 12 }}>
          <Voltra.Timer endAtMs={1765384922000} />
          <Voltra.Text>1 hour remaining</Voltra.Text>
        </Voltra.VStack>
      </VoltraView>
    ),
  },
  {
    id: 'symbol',
    title: 'Symbol',
    description: 'SF Symbols component for displaying system icons.',
    renderExample: () => (
      <VoltraView style={{ width: '100%', height: 80, backgroundColor: '#1E293B', padding: 16 }}>
        <Voltra.VStack style={{ backgroundColor: '#334155', padding: 12 }}>
          <Voltra.HStack>
            <Voltra.Symbol tintColor="#FFFFFF" name="star.fill" />
            <Voltra.Symbol tintColor="#FFFFFF" name="heart.fill" />
            <Voltra.Symbol tintColor="#FFFFFF" name="checkmark.circle.fill" />
          </Voltra.HStack>
        </Voltra.VStack>
      </VoltraView>
    ),
  },
  {
    id: 'groupbox',
    title: 'GroupBox',
    description: 'Container component for grouping related elements with visual styling.',
    renderExample: () => (
      <VoltraView style={{ width: '100%', height: 100, backgroundColor: '#1E293B', padding: 16 }}>
        <Voltra.GroupBox style={{ backgroundColor: '#334155', padding: 12 }} label={<Voltra.Text>Label</Voltra.Text>}>
          <Voltra.Text>Grouped Content</Voltra.Text>
        </Voltra.GroupBox>
      </VoltraView>
    ),
  },
  {
    id: 'lineargradient',
    title: 'LinearGradient',
    description: 'Gradient background component for creating smooth color transitions.',
    renderExample: () => (
      <VoltraView style={{ width: '100%', height: 80, backgroundColor: '#1E293B', padding: 16 }}>
        <Voltra.LinearGradient
          colors={['#FF6B6B', '#FFE66D', '#4ECDC4', '#45B7D1', '#A855F7', '#EC4899']}
          start="leading"
          end="trailing"
        >
          <Voltra.Text>Gradient</Voltra.Text>
        </Voltra.LinearGradient>
      </VoltraView>
    ),
  },
  {
    id: 'glass',
    title: 'Glass Components',
    description: 'Specialized glass effect components for iOS 26+ (Liquid Glass).',
    renderExample: () => (
      <VoltraView style={{ width: '100%', height: 120, padding: 16 }}>
        <Voltra.ZStack>
          {/* Background gradient that the glass will refract */}
          <Voltra.LinearGradient
            colors={['#FF6B6B', '#FFE66D', '#4ECDC4', '#45B7D1', '#A855F7', '#EC4899']}
            start="leading"
            end="trailing"
            style={{ width: '100%', height: '100%' }}
          />
          {/* Glass components on top */}
          <Voltra.GlassContainer spacing={10} style={{ padding: 12 }}>
            <Voltra.VStack>
              <Voltra.VStack style={{ padding: 12, borderRadius: 16, glassEffect: 'regular' }}>
                <Voltra.Text style={{ color: '#000', fontWeight: '600' }}>Glass View</Voltra.Text>
              </Voltra.VStack>

              <Voltra.VStack style={{ padding: 12, borderRadius: 16, glassEffect: 'regular' }}>
                <Voltra.Text style={{ color: '#000', fontWeight: '600' }}>Glass View</Voltra.Text>
              </Voltra.VStack>
            </Voltra.VStack>
          </Voltra.GlassContainer>
        </Voltra.ZStack>
      </VoltraView>
    ),
  },
  {
    id: 'mask',
    title: 'Mask',
    description: 'Component for applying masks to content for creative layouts.',
    renderExample: () => (
      <VoltraView style={{ width: '100%', height: 100, backgroundColor: '#1E293B', padding: 16 }}>
        <Voltra.Mask maskElement={<Voltra.Text style={{ fontSize: 48, fontWeight: 'bold' }}>MASK</Voltra.Text>}>
          <Voltra.LinearGradient
            colors={['#FF6B6B', '#FFE66D', '#4ECDC4', '#45B7D1', '#A855F7', '#EC4899']}
            start="leading"
            end="trailing"
          />
        </Voltra.Mask>
      </VoltraView>
    ),
  },
]

export default function ComponentsScreen() {
  const renderHeader = () => (
    <>
      <Text style={styles.heading}>Components Showcase</Text>
      <Text style={styles.subheading}>
        Explore all available Voltra components. Each example demonstrates the component&apos;s functionality and
        styling capabilities within Live Activities.
      </Text>
    </>
  )

  const renderItem = ({ item }: { item: (typeof COMPONENTS_DATA)[0] }) => (
    <Card key={item.id}>
      <Card.Title>{item.title}</Card.Title>
      <Card.Text>{item.description}</Card.Text>
      <View style={styles.exampleContainer}>{item.renderExample()}</View>
    </Card>
  )

  const renderFooter = () => (
    <View style={styles.footer}>
      <Link href="/testing-grounds" asChild>
        <Button title="Back to Testing Grounds" variant="ghost" />
      </Link>
    </View>
  )

  return (
    <View style={styles.container}>
      <FlatList
        style={[styles.scrollView]}
        contentContainerStyle={styles.content}
        data={COMPONENTS_DATA}
        keyExtractor={(item) => item.id}
        ListHeaderComponent={renderHeader}
        renderItem={renderItem}
        ListFooterComponent={renderFooter}
      />
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
  footer: {
    marginTop: 24,
    alignItems: 'center',
  },
  exampleContainer: {
    marginTop: 16,
  },
})
