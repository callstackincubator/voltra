import { Link } from 'expo-router'
import React from 'react'
import { FlatList, StyleSheet, Text, View } from 'react-native'
import { Voltra } from 'voltra'
import { VoltraView } from 'voltra/client'

import { Button } from '~/components/Button'
import { Card } from '~/components/Card'

const STYLING_DATA = [
  {
    id: 'padding',
    title: 'Padding',
    description: 'Demonstrates uniform padding on all edges.',
    renderExample: () => (
      <VoltraView style={{ width: '100%', height: 80, backgroundColor: '#1E293B' }}>
        <Voltra.VStack style={{ backgroundColor: '#3B82F6', padding: 16 }}>
          <Voltra.Text style={{ color: 'white' }}>Uniform Padding (16)</Voltra.Text>
        </Voltra.VStack>
      </VoltraView>
    ),
  },
  {
    id: 'individual-padding',
    title: 'Individual Edge Padding',
    description: 'Padding applied to specific edges individually.',
    renderExample: () => (
      <VoltraView style={{ width: '100%', height: 100, backgroundColor: '#1E293B' }}>
        <Voltra.VStack
          style={{
            backgroundColor: '#10B981',
            paddingTop: 8,
            paddingBottom: 16,
            paddingLeft: 12,
            paddingRight: 20,
          }}
        >
          <Voltra.Text style={{ color: 'white' }}>T:8, B:16, L:12, R:20</Voltra.Text>
        </Voltra.VStack>
      </VoltraView>
    ),
  },
  {
    id: 'horizontal-vertical-padding',
    title: 'Horizontal & Vertical Padding',
    description: 'Horizontal and vertical padding shortcuts.',
    renderExample: () => (
      <VoltraView style={{ width: '100%', height: 80, backgroundColor: '#1E293B' }}>
        <Voltra.VStack style={{ backgroundColor: '#F59E0B', paddingHorizontal: 20, paddingVertical: 12 }}>
          <Voltra.Text style={{ color: 'white' }}>Horizontal:20, Vertical:12</Voltra.Text>
        </Voltra.VStack>
      </VoltraView>
    ),
  },
  {
    id: 'margin',
    title: 'Margin',
    description: 'Demonstrates uniform margin on all edges.',
    renderExample: () => (
      <VoltraView style={{ width: '100%', height: 100, backgroundColor: '#1E293B' }}>
        <Voltra.VStack style={{ backgroundColor: '#8B5CF6', margin: 12 }}>
          <Voltra.Text style={{ color: 'white' }}>Uniform Margin (12)</Voltra.Text>
        </Voltra.VStack>
      </VoltraView>
    ),
  },
  {
    id: 'individual-margins',
    title: 'Individual Edge Margins',
    description: 'Margins applied to specific edges individually.',
    renderExample: () => (
      <VoltraView style={{ width: '100%', height: 100, backgroundColor: '#1E293B' }}>
        <Voltra.VStack
          style={{ backgroundColor: '#EF4444', marginTop: 8, marginBottom: 16, marginLeft: 12, marginRight: 20 }}
        >
          <Voltra.Text style={{ color: 'white' }}>T:8, B:16, L:12, R:20</Voltra.Text>
        </Voltra.VStack>
      </VoltraView>
    ),
  },
  {
    id: 'text-colors',
    title: 'Text Colors',
    description: 'Different text colors using the color property.',
    renderExample: () => (
      <VoltraView style={{ width: '100%', height: 120, backgroundColor: '#1E293B', padding: 16 }}>
        <Voltra.VStack>
          <Voltra.Text style={{ color: '#FFFFFF' }}>White Text</Voltra.Text>
          <Voltra.Text style={{ color: '#3B82F6' }}>Blue Text</Voltra.Text>
          <Voltra.Text style={{ color: '#10B981' }}>Green Text</Voltra.Text>
          <Voltra.Text style={{ color: '#F59E0B' }}>Orange Text</Voltra.Text>
        </Voltra.VStack>
      </VoltraView>
    ),
  },
  {
    id: 'background-colors',
    title: 'Background Colors',
    description: 'Different background colors applied to containers.',
    renderExample: () => (
      <VoltraView style={{ width: '100%', height: 100, backgroundColor: '#1E293B' }}>
        <Voltra.HStack>
          <Voltra.VStack style={{ backgroundColor: '#3B82F6', flexGrowWidth: true, padding: 8 }}>
            <Voltra.Text style={{ color: 'white' }}>Blue</Voltra.Text>
          </Voltra.VStack>
          <Voltra.VStack style={{ backgroundColor: '#10B981', flexGrowWidth: true, padding: 8 }}>
            <Voltra.Text style={{ color: 'white' }}>Green</Voltra.Text>
          </Voltra.VStack>
          <Voltra.VStack style={{ backgroundColor: '#F59E0B', flexGrowWidth: true, padding: 8 }}>
            <Voltra.Text style={{ color: 'white' }}>Orange</Voltra.Text>
          </Voltra.VStack>
        </Voltra.HStack>
      </VoltraView>
    ),
  },
  {
    id: 'borders',
    title: 'Borders',
    description: 'Border radius, width, and color properties.',
    renderExample: () => (
      <VoltraView style={{ width: '100%', height: 120, backgroundColor: '#1E293B' }}>
        <Voltra.HStack>
          <Voltra.VStack
            style={{
              backgroundColor: '#3B82F6',
              borderRadius: 8,
              borderWidth: 2,
              borderColor: '#1E40AF',
              flexGrowWidth: true,
              padding: 12,
            }}
          >
            <Voltra.Text style={{ color: 'white' }}>Rounded</Voltra.Text>
          </Voltra.VStack>
          <Voltra.VStack
            style={{
              backgroundColor: '#10B981',
              borderRadius: 120,
              borderWidth: 3,
              borderColor: '#047857',
              flexGrowWidth: true,
              padding: 12,
            }}
          >
            <Voltra.Text style={{ color: 'white' }}>More Rounded</Voltra.Text>
          </Voltra.VStack>
        </Voltra.HStack>
      </VoltraView>
    ),
  },
  {
    id: 'shadows',
    title: 'Shadows',
    description: 'Shadow effects with color, offset, opacity, and radius.',
    renderExample: () => (
      <VoltraView style={{ width: '100%', height: 100, backgroundColor: '#1E293B' }}>
        <Voltra.VStack
          style={{
            backgroundColor: '#FFFFFF',
            shadowColor: '#FF0000',
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.5,
            shadowRadius: 8,
            padding: 16,
          }}
        >
          <Voltra.Text style={{ color: '#1F2937' }}>Shadow Effect</Voltra.Text>
        </Voltra.VStack>
      </VoltraView>
    ),
  },
  {
    id: 'typography',
    title: 'Typography',
    description: 'Font size, weight, and letter spacing variations.',
    renderExample: () => (
      <VoltraView style={{ width: '100%', height: 140, backgroundColor: '#1E293B', padding: 16 }}>
        <Voltra.VStack>
          <Voltra.Text style={{ color: '#FFFFFF', fontSize: 12 }}>Small Text (12px)</Voltra.Text>
          <Voltra.Text style={{ color: '#FFFFFF', fontSize: 16 }}>Normal Text (16px)</Voltra.Text>
          <Voltra.Text style={{ color: '#FFFFFF', fontSize: 20, fontWeight: 'bold' }}>Large Bold (20px)</Voltra.Text>
          <Voltra.Text style={{ color: '#3B82F6', letterSpacing: 2 }}>Spaced Letters</Voltra.Text>
        </Voltra.VStack>
      </VoltraView>
    ),
  },
  {
    id: 'opacity',
    title: 'Opacity',
    description: 'Opacity values applied to containers.',
    renderExample: () => (
      <VoltraView style={{ width: '100%', height: 100, backgroundColor: '#1E293B' }}>
        <Voltra.HStack>
          <Voltra.VStack style={{ backgroundColor: '#3B82F6', opacity: 1.0, flexGrowWidth: true, padding: 8 }}>
            <Voltra.Text style={{ color: 'white' }}>100%</Voltra.Text>
          </Voltra.VStack>
          <Voltra.VStack style={{ backgroundColor: '#3B82F6', opacity: 0.7, flexGrowWidth: true, padding: 8 }}>
            <Voltra.Text style={{ color: 'white' }}>70%</Voltra.Text>
          </Voltra.VStack>
          <Voltra.VStack style={{ backgroundColor: '#3B82F6', opacity: 0.4, flexGrowWidth: true, padding: 8 }}>
            <Voltra.Text style={{ color: 'white' }}>40%</Voltra.Text>
          </Voltra.VStack>
        </Voltra.HStack>
      </VoltraView>
    ),
  },
  {
    id: 'combined-styling',
    title: 'Combined Styling',
    description: 'A complex example combining multiple styling properties.',
    renderExample: () => (
      <VoltraView style={{ width: '100%', height: 120, backgroundColor: '#1E293B' }}>
        <Voltra.VStack
          style={{
            backgroundColor: '#8B5CF6',
            borderRadius: 12,
            borderWidth: 2,
            borderColor: '#7C3AED',
            shadowColor: '#000000',
            shadowOffset: { width: 0, height: 3 },
            shadowOpacity: 0.2,
            shadowRadius: 6,
            padding: 16,
            margin: 8,
          }}
        >
          <Voltra.Text
            style={{
              color: '#FFFFFF',
              fontSize: 16,
              fontWeight: 'bold',
              letterSpacing: 0.5,
            }}
          >
            Complex Example
          </Voltra.Text>
          <Voltra.Text
            style={{
              color: '#E9D5FF',
              fontSize: 12,
              marginTop: 4,
            }}
          >
            Multiple properties combined
          </Voltra.Text>
        </Voltra.VStack>
      </VoltraView>
    ),
  },
]

export default function StylingScreen() {
  const renderHeader = () => (
    <>
      <Text style={styles.heading}>Styling Examples</Text>
      <Text style={styles.subheading}>
        Explore Voltra&apos;s styling capabilities. Each example demonstrates different styling properties that can be
        applied to Voltra components.
      </Text>
    </>
  )

  const renderItem = ({ item }: { item: (typeof STYLING_DATA)[0] }) => (
    <Card key={item.id}>
      <Card.Title>{item.title}</Card.Title>
      <Card.Text>{item.description}</Card.Text>
      {item.renderExample()}
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
        data={STYLING_DATA}
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
})
