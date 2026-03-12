import { useRouter } from 'expo-router'
import React, { useState } from 'react'
import { ScrollView, StyleSheet, Text, View } from 'react-native'
import { VoltraAndroid } from 'voltra/android'
import { AndroidWidgetFamily, VoltraWidgetPreview } from 'voltra/android/client'

import { Button } from '~/components/Button'
import { Card } from '~/components/Card'

const WIDGET_SIZES: { id: AndroidWidgetFamily; title: string }[] = [
  { id: 'mediumWide', title: 'Medium Wide' },
  { id: 'mediumSquare', title: 'Medium Square' },
  { id: 'large', title: 'Large' },
  { id: 'extraLarge', title: 'Extra Large' },
]

export const CustomFontShowcaseWidget = () => (
  <VoltraAndroid.Box
    style={{
      width: '100%',
      height: '100%',
      backgroundColor: '#0F172A',
      padding: 16,
    }}
  >
    <VoltraAndroid.Column style={{ width: '100%', height: '100%' }} verticalAlignment="top" horizontalAlignment="start">
      {/* Pacifico — handwriting/script font */}
      <VoltraAndroid.Text
        renderAsBitmap
        style={{
          fontSize: 26,
          fontFamily: 'Pacifico_400Regular',
          color: '#F472B6',
          marginBottom: 4,
        }}
      >
        Hello Voltra!
      </VoltraAndroid.Text>

      {/* Press Start 2P — retro pixel font */}
      <VoltraAndroid.Text
        renderAsBitmap
        style={{
          fontSize: 10,
          fontFamily: 'PressStart2P_400Regular',
          color: '#34D399',
          marginBottom: 8,
        }}
      >
        PIXEL FONT
      </VoltraAndroid.Text>

      {/* Normal Glance text for comparison */}
      <VoltraAndroid.Text
        style={{
          fontSize: 13,
          color: '#94A3B8',
        }}
      >
        ↑ bitmap rendered · ↓ native Glance
      </VoltraAndroid.Text>

      <VoltraAndroid.Text
        style={{
          fontSize: 16,
          fontWeight: 'bold',
          color: '#E2E8F0',
          marginTop: 4,
        }}
      >
        Default System Font
      </VoltraAndroid.Text>
    </VoltraAndroid.Column>
  </VoltraAndroid.Box>
)

export default function AndroidCustomFontScreen() {
  const router = useRouter()
  const [selectedSize, setSelectedSize] = useState<AndroidWidgetFamily>('large')

  return (
    <View style={styles.container}>
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.content}>
        <Text style={styles.heading}>Custom Font Widgets</Text>
        <Text style={styles.subheading}>
          Demonstrates custom font rendering on Android Glance widgets.{'\n'}
          Text with <Text style={styles.code}>renderAsBitmap</Text> is drawn to a Canvas bitmap with a custom Typeface
          loaded from <Text style={styles.code}>assets/fonts/</Text>.
        </Text>

        <Card>
          <Card.Title>Widget Size</Card.Title>
          <View style={styles.buttonRow}>
            {WIDGET_SIZES.map((size) => (
              <Button
                key={size.id}
                title={size.title}
                variant={selectedSize === size.id ? 'primary' : 'secondary'}
                onPress={() => setSelectedSize(size.id)}
                style={styles.choiceButton}
              />
            ))}
          </View>
        </Card>

        <Card>
          <Card.Title>Live Preview</Card.Title>
          <Card.Text>
            Pacifico (script) and Press Start 2P (pixel) are rendered as bitmaps. Compare with the native Glance text
            below them.
          </Card.Text>
          <View style={styles.previewContainer}>
            <View style={styles.previewWrapper}>
              <VoltraWidgetPreview family={selectedSize} style={styles.widgetBorder}>
                <CustomFontShowcaseWidget />
              </VoltraWidgetPreview>
            </View>
          </View>
        </Card>

        <Card>
          <Card.Title>How It Works</Card.Title>
          <Card.Text>
            1. Add font packages (e.g. @expo-google-fonts/pacifico) or place .ttf files in your project{'\n'}
            2. Add font paths to the &quot;fonts&quot; array in your Voltra plugin config{'\n'}
            3. Set fontFamily in style to the filename without extension{'\n'}
            4. Add renderAsBitmap prop to {'<'}Text{'>'}
            {'\n'}
            5. Run prebuild — the plugin copies fonts to assets/fonts/ automatically
          </Card.Text>
        </Card>

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
  code: {
    fontFamily: 'monospace',
    color: '#A78BFA',
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
