import { useRouter } from 'expo-router'
import React from 'react'
import { ScrollView, StyleSheet, Text, View } from 'react-native'

import { Button } from '~/components/Button'
import { Card } from '~/components/Card'

const TESTING_GROUNDS_SECTIONS = [
  {
    id: 'weather',
    title: 'Weather Widget',
    description:
      'Test the weather widget with different conditions, gradients, and real-time updates. Change weather conditions and see the widget update instantly.',
    route: '/testing-grounds/weather',
  },
  {
    id: 'styling',
    title: 'Styling',
    description:
      'Explore Voltra styling properties including padding, margins, colors, borders, shadows, and typography.',
    route: '/testing-grounds/styling',
  },
  {
    id: 'components',
    title: 'Components',
    description:
      'Explore all available Voltra components including Button, Text, VStack, HStack, ZStack, Image, and more.',
    route: '/testing-grounds/components',
  },
  {
    id: 'image-preloading',
    title: 'Image Preloading',
    description:
      'Test image preloading functionality for Live Activities. Download images to App Group storage and verify they appear in Live Activities.',
    route: '/testing-grounds/image-preloading',
  },
  // Add more sections here as they are implemented
]

export default function TestingGroundsScreen() {
  const router = useRouter()

  return (
    <View style={styles.container}>
      <ScrollView style={[styles.scrollView]} contentContainerStyle={styles.content}>
        <Text style={styles.heading}>Testing Grounds</Text>
        <Text style={styles.subheading}>
          Explore different aspects of Voltra development. Each section provides hands-on examples and demonstrations of
          specific features.
        </Text>

        {TESTING_GROUNDS_SECTIONS.map((section) => (
          <Card key={section.id}>
            <Card.Title>{section.title}</Card.Title>
            <Card.Text>{section.description}</Card.Text>
            <View style={styles.buttonContainer}>
              <Button title={`Explore ${section.title}`} variant="primary" onPress={() => router.push(section.route)} />
            </View>
          </Card>
        ))}

        <View style={styles.footer}>
          <Button title="Back to Live Activities" variant="ghost" onPress={() => router.push('/live-activities')} />
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
  },
  subheading: {
    fontSize: 14,
    lineHeight: 20,
    color: '#CBD5F5',
    marginBottom: 8,
  },
  buttonContainer: {
    marginTop: 16,
  },
  footer: {
    marginTop: 24,
    alignItems: 'center',
  },
})
