import { useRouter } from 'expo-router'
import React from 'react'
import { ScrollView, StyleSheet, Text, View } from 'react-native'

import { Button } from '~/components/Button'
import { Card } from '~/components/Card'

const ANDROID_SECTIONS = [
  {
    id: 'pin-widgets',
    title: 'Pin Widgets',
    description:
      'Request to pin widgets directly from your app. Show the Android system pin widget dialog without leaving your app.',
    route: '/android-widgets/pin',
  },
  {
    id: 'image-preloading',
    title: 'Image Preloading',
    description:
      'Test image preloading for Android Widgets. Download images to the app cache and verify they appear in your widgets.',
    route: '/android-widgets/image-preloading',
  },
  {
    id: 'preview-widgets',
    title: 'Widget Previews',
    description: 'Preview your Android widget layouts directly within the app using VoltraWidgetPreview.',
    route: '/android-widgets/preview',
  },
  // Add more Android-specific sections here as they are implemented
]

export default function AndroidScreen() {
  const router = useRouter()

  return (
    <View style={styles.container}>
      <ScrollView style={[styles.scrollView]} contentContainerStyle={styles.content}>
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
