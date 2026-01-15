import { useRouter } from 'expo-router'
import React, { useState } from 'react'
import { ScrollView, StyleSheet, Text, View } from 'react-native'
import { VoltraAndroid } from 'voltra/android'
import { AndroidWidgetFamily, VoltraWidgetPreview } from 'voltra/android/client'

import { Button } from '~/components/Button'
import { Card } from '~/components/Card'

const ANDROID_WIDGET_FAMILIES: { id: AndroidWidgetFamily; title: string; description: string }[] = [
  {
    id: 'small',
    title: 'Small',
    description: '2x1 grid equivalent (150x100 dp)',
  },
  {
    id: 'mediumSquare',
    title: 'Medium Square',
    description: '2x2 grid equivalent (200x200 dp)',
  },
  {
    id: 'mediumWide',
    title: 'Medium Wide',
    description: '3x2 grid equivalent (250x150 dp)',
  },
  {
    id: 'mediumTall',
    title: 'Medium Tall',
    description: '2x3 grid equivalent (150x250 dp)',
  },
  {
    id: 'large',
    title: 'Large',
    description: '4x2 grid equivalent (300x200 dp)',
  },
  {
    id: 'extraLarge',
    title: 'Extra Large',
    description: '4x4 grid equivalent (350x300 dp)',
  },
]

const PreviewWidget = ({ title, color }: { title: string; color: string }) => (
  <VoltraAndroid.Scaffold
    backgroundColor={color}
    style={{
      flex: 1,
      width: '100%',
      height: '100%',
    }}
  >
    <VoltraAndroid.Column
      style={{
        padding: 16,
        flex: 1,
        width: '100%',
      }}
      verticalAlignment="center-vertically"
      horizontalAlignment="center-horizontally"
    >
      <VoltraAndroid.Box
        style={{
          backgroundColor: 'rgba(255, 255, 255, 0.2)',
          borderRadius: 12,
          padding: 12,
        }}
      >
        <VoltraAndroid.Text
          style={{
            fontSize: 18,
            fontWeight: 'bold',
            color: 'white',
          }}
        >
          {title}
        </VoltraAndroid.Text>
      </VoltraAndroid.Box>
      <VoltraAndroid.Spacer style={{ height: 8 }} />
      <VoltraAndroid.Text
        style={{
          fontSize: 14,
          color: 'white',
          opacity: 0.8,
        }}
      >
        Native Preview
      </VoltraAndroid.Text>
    </VoltraAndroid.Column>
  </VoltraAndroid.Scaffold>
)

export default function AndroidPreviewScreen() {
  const router = useRouter()
  const [selectedFamily, setSelectedFamily] = useState<AndroidWidgetFamily>('mediumWide')
  const [accentColor, setAccentColor] = useState('#3DDC84') // Android Green

  const COLORS = [
    { name: 'Android Green', value: '#3DDC84' },
    { name: 'Voltra Purple', value: '#8232FF' },
    { name: 'Deep Blue', value: '#1A73E8' },
    { name: 'Sunset Orange', value: '#F4511E' },
  ]

  return (
    <View style={styles.container}>
      <ScrollView style={[styles.scrollView]} contentContainerStyle={styles.content}>
        <Text style={styles.heading}>Widget Preview Testing</Text>
        <Text style={styles.subheading}>
          Test how your Android widgets look at different sizes without leaving the app. These previews use the actual
          native Glance renderers for 100% accuracy.
        </Text>

        {/* Family Selection */}
        <Card>
          <Card.Title>Widget Size: {ANDROID_WIDGET_FAMILIES.find((f) => f.id === selectedFamily)?.title}</Card.Title>
          <Card.Text>{ANDROID_WIDGET_FAMILIES.find((f) => f.id === selectedFamily)?.description}</Card.Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.scrollArea}>
            <View style={styles.buttonRow}>
              {ANDROID_WIDGET_FAMILIES.map((family) => (
                <Button
                  key={family.id}
                  title={family.title}
                  variant={selectedFamily === family.id ? 'primary' : 'secondary'}
                  onPress={() => setSelectedFamily(family.id)}
                  style={styles.choiceButton}
                />
              ))}
            </View>
          </ScrollView>
        </Card>

        {/* Color Selection */}
        <Card>
          <Card.Title>Customize Style</Card.Title>
          <View style={styles.buttonRow}>
            {COLORS.map((color) => (
              <Button
                key={color.value}
                title={color.name}
                variant={accentColor === color.value ? 'primary' : 'secondary'}
                onPress={() => setAccentColor(color.value)}
                style={styles.choiceButton}
              />
            ))}
          </View>
        </Card>

        {/* Preview Area */}
        <Card>
          <Card.Title>Live Preview</Card.Title>
          <Card.Text>This is rendered using a native Android View inside the app.</Card.Text>
          <View style={styles.previewContainer}>
            <View style={styles.previewWrapper}>
              <VoltraWidgetPreview family={selectedFamily} style={styles.widgetBorder}>
                <PreviewWidget title="Voltra Android" color={accentColor} />
              </VoltraWidgetPreview>
            </View>
          </View>
        </Card>

        {/* Back Button */}
        <View style={styles.footer}>
          <Button title="Back to Android Home" variant="ghost" onPress={() => router.back()} />
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
    marginBottom: 24,
  },
  scrollArea: {
    marginHorizontal: -4,
  },
  buttonRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 4,
    gap: 8,
    marginTop: 16,
  },
  choiceButton: {
    minWidth: 100,
  },
  previewContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    marginTop: 8,
    backgroundColor: '#0F172A',
    borderRadius: 12,
  },
  previewWrapper: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  widgetBorder: {
    borderRadius: 24,
    overflow: 'hidden',
  },
  footer: {
    marginTop: 24,
    alignItems: 'center',
  },
})
