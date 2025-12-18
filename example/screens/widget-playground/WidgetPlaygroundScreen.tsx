import { useRouter } from 'expo-router'
import React, { useState } from 'react'
import { ScrollView, StyleSheet, Text, View, useColorScheme } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { Voltra, VoltraWidgetPreview } from 'voltra'

import { Button } from '~/components/Button'
import { Card } from '~/components/Card'

type WidgetFamily =
  | 'systemSmall'
  | 'systemMedium'
  | 'systemLarge'
  | 'systemExtraLarge'
  | 'accessoryCircular'
  | 'accessoryRectangular'
  | 'accessoryInline'

const WIDGET_FAMILIES: { id: WidgetFamily; title: string; description: string }[] = [
  {
    id: 'systemSmall',
    title: 'System Small',
    description: '2x2 grid widget (170x170pt) - Perfect for simple info like weather or time.',
  },
  {
    id: 'systemMedium',
    title: 'System Medium',
    description: '4x2 grid widget (364x170pt) - Good for more detailed information.',
  },
  {
    id: 'systemLarge',
    title: 'System Large',
    description: '4x4 grid widget (364x382pt) - Best for complex layouts and multiple data points.',
  },
  {
    id: 'systemExtraLarge',
    title: 'System Extra Large',
    description: '4x8 grid widget (364x768pt) - Available on iPad, great for extensive content.',
  },
  {
    id: 'accessoryCircular',
    title: 'Accessory Circular',
    description: 'Circular widget (76x76pt) - Appears on Lock Screen, perfect for glanceable info.',
  },
  {
    id: 'accessoryRectangular',
    title: 'Accessory Rectangular',
    description: 'Rectangular widget (172x76pt) - Appears on Lock Screen, good for text and small images.',
  },
  {
    id: 'accessoryInline',
    title: 'Accessory Inline',
    description: 'Inline widget (172x40pt) - Compact horizontal layout for Lock Screen.',
  },
]

const SAMPLE_CONTENT = {
  weather: (family: WidgetFamily) => {
    if (family === 'systemSmall') {
      return (
        <Voltra.VStack alignment="center" spacing={4}>
          <Voltra.Text style={{ color: '#FFFFFF', fontSize: 24, fontWeight: 'bold' }}>72°</Voltra.Text>
          <Voltra.Text style={{ color: '#FFFFFF', fontSize: 12, opacity: 0.7 }}>Sunny</Voltra.Text>
        </Voltra.VStack>
      )
    }

    if (family === 'systemMedium') {
      return (
        <Voltra.HStack alignment="center" spacing={12}>
          <Voltra.VStack alignment="center" spacing={2}>
            <Voltra.Text style={{ color: '#FFFFFF', fontSize: 32, fontWeight: 'bold' }}>72°</Voltra.Text>
            <Voltra.Text style={{ color: '#FFFFFF', fontSize: 14, opacity: 0.7 }}>Sunny</Voltra.Text>
          </Voltra.VStack>
          <Voltra.VStack spacing={4}>
            <Voltra.HStack spacing={8}>
              <Voltra.Text style={{ color: '#FFFFFF', fontSize: 12 }}>High:</Voltra.Text>
              <Voltra.Text style={{ color: '#FFFFFF', fontSize: 12, fontWeight: 'semibold' }}>78°</Voltra.Text>
            </Voltra.HStack>
            <Voltra.HStack spacing={8}>
              <Voltra.Text style={{ color: '#FFFFFF', fontSize: 12 }}>Low:</Voltra.Text>
              <Voltra.Text style={{ color: '#FFFFFF', fontSize: 12, fontWeight: 'semibold' }}>65°</Voltra.Text>
            </Voltra.HStack>
          </Voltra.VStack>
        </Voltra.HStack>
      )
    }

    if (family === 'systemLarge') {
      return (
        <Voltra.VStack spacing={16}>
          <Voltra.VStack alignment="center" spacing={4}>
            <Voltra.Text style={{ color: '#FFFFFF', fontSize: 48, fontWeight: 'bold' }}>72°</Voltra.Text>
            <Voltra.Text style={{ color: '#FFFFFF', fontSize: 18, opacity: 0.7 }}>Sunny</Voltra.Text>
          </Voltra.VStack>
          <Voltra.VStack spacing={8}>
            <Voltra.HStack spacing={12} alignment="center">
              <Voltra.Text style={{ color: '#FFFFFF', fontSize: 14 }}>Today</Voltra.Text>
              <Voltra.Text style={{ color: '#FFFFFF', fontSize: 14, fontWeight: 'semibold' }}>72°</Voltra.Text>
              <Voltra.Text style={{ color: '#FFFFFF', fontSize: 14, opacity: 0.6 }}>Sunny</Voltra.Text>
            </Voltra.HStack>
            <Voltra.HStack spacing={12} alignment="center">
              <Voltra.Text style={{ color: '#FFFFFF', fontSize: 14 }}>Tomorrow</Voltra.Text>
              <Voltra.Text style={{ color: '#FFFFFF', fontSize: 14, fontWeight: 'semibold' }}>75°</Voltra.Text>
              <Voltra.Text style={{ color: '#FFFFFF', fontSize: 14, opacity: 0.6 }}>Cloudy</Voltra.Text>
            </Voltra.HStack>
            <Voltra.HStack spacing={12} alignment="center">
              <Voltra.Text style={{ color: '#FFFFFF', fontSize: 14 }}>Wednesday</Voltra.Text>
              <Voltra.Text style={{ color: '#FFFFFF', fontSize: 14, fontWeight: 'semibold' }}>68°</Voltra.Text>
              <Voltra.Text style={{ color: '#FFFFFF', fontSize: 14, opacity: 0.6 }}>Rain</Voltra.Text>
            </Voltra.HStack>
          </Voltra.VStack>
        </Voltra.VStack>
      )
    }

    if (family === 'accessoryCircular') {
      return (
        <Voltra.VStack alignment="center" spacing={2}>
          <Voltra.Text style={{ color: '#FFFFFF', fontSize: 16, fontWeight: 'bold' }}>72°</Voltra.Text>
          <Voltra.Text style={{ color: '#FFFFFF', fontSize: 10, opacity: 0.7 }}>Sunny</Voltra.Text>
        </Voltra.VStack>
      )
    }

    if (family === 'accessoryRectangular') {
      return (
        <Voltra.HStack alignment="center" spacing={8}>
          <Voltra.Text style={{ color: '#FFFFFF', fontSize: 14, fontWeight: 'bold' }}>72°</Voltra.Text>
          <Voltra.Text style={{ color: '#FFFFFF', fontSize: 12, opacity: 0.7 }}>Sunny</Voltra.Text>
        </Voltra.HStack>
      )
    }

    // accessoryInline and systemExtraLarge - fallback to small content
    return (
      <Voltra.VStack alignment="center" spacing={2}>
        <Voltra.Text style={{ color: '#FFFFFF', fontSize: 12, fontWeight: 'bold' }}>72° Sunny</Voltra.Text>
      </Voltra.VStack>
    )
  },
}

export default function WidgetPlaygroundScreen() {
  const insets = useSafeAreaInsets()
  const router = useRouter()
  const colorScheme = useColorScheme()
  const [selectedFamily, setSelectedFamily] = useState<WidgetFamily>('systemSmall')

  const selectedFamilyData = WIDGET_FAMILIES.find((f) => f.id === selectedFamily)!

  const widgetPreviewStyle = {
    borderRadius: 16,
    backgroundColor: colorScheme === 'light' ? 'rgba(0, 0, 0, 0.4)' : 'rgba(255, 255, 255, 0.8)',
  }

  return (
    <View style={styles.container}>
      <ScrollView
        style={[styles.scrollView]}
        contentContainerStyle={[styles.content, { paddingTop: insets.top, paddingBottom: insets.bottom }]}
      >
        <Text style={styles.heading}>Widget Playground</Text>
        <Text style={styles.subheading}>
          Preview how your Voltra widgets will look across different iOS widget sizes. Select a widget family to see the
          preview.
        </Text>

        {/* Widget Family Selection */}
        <Card>
          <Text style={styles.sectionTitle}>Widget Family</Text>
          <Text style={styles.sectionDescription}>{selectedFamilyData.description}</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.familyScroll}>
            <View style={styles.familyButtons}>
              {WIDGET_FAMILIES.map((family) => (
                <Button
                  key={family.id}
                  title={family.title}
                  variant={selectedFamily === family.id ? 'primary' : 'secondary'}
                  onPress={() => setSelectedFamily(family.id)}
                  style={styles.familyButton}
                />
              ))}
            </View>
          </ScrollView>
        </Card>

        {/* Widget Preview */}
        <Card>
          <Text style={styles.sectionTitle}>Preview</Text>
          <Text style={styles.sectionDescription}>
            This is how your widget will appear at {selectedFamilyData.title.toLowerCase()} size.
          </Text>
          <View style={styles.previewContainer}>
            <VoltraWidgetPreview family={selectedFamily} style={widgetPreviewStyle}>
              {SAMPLE_CONTENT.weather(selectedFamily)}
            </VoltraWidgetPreview>
          </View>
        </Card>

        {/* Back Button */}
        <Button
          title="Back to Live Activities"
          variant="secondary"
          onPress={() => router.back()}
          style={styles.backButton}
        />
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
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 8,
  },
  sectionDescription: {
    fontSize: 14,
    color: '#CBD5F5',
    marginBottom: 16,
    lineHeight: 20,
  },
  familyScroll: {
    marginHorizontal: -4,
  },
  familyButtons: {
    flexDirection: 'row',
    paddingHorizontal: 4,
    gap: 8,
  },
  familyButton: {
    minWidth: 120,
  },
  previewContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
    marginTop: 8,
  },
  backButton: {
    marginTop: 24,
    borderWidth: 1,
    borderColor: 'rgba(130, 50, 255, 0.4)',
    backgroundColor: 'rgba(130, 50, 255, 0.1)',
  },
})
