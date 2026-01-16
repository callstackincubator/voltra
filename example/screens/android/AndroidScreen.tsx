import { useRouter } from 'expo-router'
import React from 'react'
import { ScrollView, StyleSheet, Text, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

import { Button } from '~/components/Button'
import { Card } from '~/components/Card'

const ANDROID_SECTIONS = [
  {
    id: 'widgets',
    title: 'Android Widgets',
    description:
      'Test Android home screen widgets powered by Jetpack Glance. Create and update widgets with different sizes and content.',
    route: '/android-widgets/testing',
  },
  // Add more Android-specific sections here as they are implemented
]

export default function AndroidScreen() {
  const insets = useSafeAreaInsets()
  const router = useRouter()

  return (
    <View style={styles.container}>
      <ScrollView
        style={[styles.scrollView]}
        contentContainerStyle={[styles.content, { paddingTop: insets.top, paddingBottom: insets.bottom }]}
      >
        <Text style={styles.heading}>Voltra for Android</Text>
        <Text style={styles.subheading}>
          Voltra for Android lets you build custom Android Widgets and Live Updates using React Native - no need to
          write Kotlin or XML anymore.
        </Text>

        {ANDROID_SECTIONS.map((section) => (
          <Card key={section.id}>
            <Card.Title>{section.title}</Card.Title>
            <Card.Text>{section.description}</Card.Text>
            <View style={styles.buttonContainer}>
              <Button title={`Explore ${section.title}`} variant="primary" onPress={() => router.push(section.route)} />
            </View>
          </Card>
        ))}
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
})
