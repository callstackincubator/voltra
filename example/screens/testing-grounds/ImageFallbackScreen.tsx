import { Link } from 'expo-router'
import React from 'react'
import { Alert, ScrollView, StyleSheet, Text, View } from 'react-native'
import { Voltra } from 'voltra'
import { startLiveActivity } from 'voltra/client'

import { Button } from '~/components/Button'
import { Card } from '~/components/Card'

export default function ImageFallbackScreen() {
  const handleShowExample = async (exampleName: string, content: React.ReactElement) => {
    try {
      await startLiveActivity(
        {
          lockScreen: content,
        },
        {
          activityName: `image-fallback-${exampleName}`,
        }
      )
      Alert.alert('Success', `${exampleName} example started. Check your Dynamic Island or Lock Screen!`)
    } catch (error) {
      Alert.alert('Error', `Failed to start activity: ${error}`)
    }
  }

  return (
    <ScrollView style={styles.container}>
      <View style={styles.scrollView}>
        <Text style={styles.heading}>Image Fallback with Styles</Text>
        <Text style={styles.subheading}>
          Test the new image fallback behavior using backgroundColor from styles instead of the deprecated fallbackColor
          prop.
        </Text>

        <Card>
          <Card.Title>1. Missing Image with Background Color</Card.Title>
          <Card.Text>
            When an image is missing and no fallback component is provided, the backgroundColor from styles is used.
          </Card.Text>
          <View style={styles.buttonRow}>
            <Button
              title="Show Example"
              variant="primary"
              onPress={() =>
                handleShowExample(
                  'Background Color',
                  <Voltra.VStack style={{ padding: 16, backgroundColor: '#1E293B' }} spacing={12}>
                    <Voltra.Text style={{ fontSize: 18, fontWeight: 'bold', color: '#FFFFFF' }}>
                      Missing Image Test
                    </Voltra.Text>
                    <Voltra.HStack spacing={8}>
                      <Voltra.Image
                        source={{ assetName: 'nonexistent-image' }}
                        style={{
                          width: 60,
                          height: 60,
                          backgroundColor: '#EF4444',
                          borderRadius: 12,
                        }}
                      />
                      <Voltra.VStack spacing={4}>
                        <Voltra.Text style={{ fontSize: 14, fontWeight: '600', color: '#F1F5F9' }}>
                          Red Background
                        </Voltra.Text>
                        <Voltra.Text style={{ fontSize: 12, color: '#94A3B8' }}>backgroundColor: '#EF4444'</Voltra.Text>
                      </Voltra.VStack>
                    </Voltra.HStack>
                  </Voltra.VStack>
                )
              }
            />
          </View>
        </Card>

        <Card>
          <Card.Title>2. Multiple Fallback Colors</Card.Title>
          <Card.Text>
            Display multiple missing images with different background colors to demonstrate the style-based approach.
          </Card.Text>
          <View style={styles.buttonRow}>
            <Button
              title="Show Example"
              variant="primary"
              onPress={() =>
                handleShowExample(
                  'Multiple Colors',
                  <Voltra.VStack style={{ padding: 16, backgroundColor: '#0F172A' }} spacing={12}>
                    <Voltra.Text style={{ fontSize: 18, fontWeight: 'bold', color: '#FFFFFF' }}>
                      Color Palette
                    </Voltra.Text>
                    <Voltra.HStack spacing={8}>
                      <Voltra.Image
                        source={{ assetName: 'missing-1' }}
                        style={{
                          width: 50,
                          height: 50,
                          backgroundColor: '#EF4444',
                          borderRadius: 8,
                        }}
                      />
                      <Voltra.Image
                        source={{ assetName: 'missing-2' }}
                        style={{
                          width: 50,
                          height: 50,
                          backgroundColor: '#F59E0B',
                          borderRadius: 8,
                        }}
                      />
                      <Voltra.Image
                        source={{ assetName: 'missing-3' }}
                        style={{
                          width: 50,
                          height: 50,
                          backgroundColor: '#10B981',
                          borderRadius: 8,
                        }}
                      />
                      <Voltra.Image
                        source={{ assetName: 'missing-4' }}
                        style={{
                          width: 50,
                          height: 50,
                          backgroundColor: '#3B82F6',
                          borderRadius: 8,
                        }}
                      />
                    </Voltra.HStack>
                  </Voltra.VStack>
                )
              }
            />
          </View>
        </Card>

        <Card>
          <Card.Title>3. Transparent Fallback (No Background)</Card.Title>
          <Card.Text>
            When no backgroundColor is specified, the fallback is transparent, allowing the parent background to show
            through.
          </Card.Text>
          <View style={styles.buttonRow}>
            <Button
              title="Show Example"
              variant="primary"
              onPress={() =>
                handleShowExample(
                  'Transparent',
                  <Voltra.VStack style={{ padding: 16, backgroundColor: '#6366F1' }} spacing={12}>
                    <Voltra.Text style={{ fontSize: 18, fontWeight: 'bold', color: '#FFFFFF' }}>
                      Transparent Fallback
                    </Voltra.Text>
                    <Voltra.Image
                      source={{ assetName: 'nonexistent' }}
                      style={{
                        width: 100,
                        height: 100,
                        borderRadius: 16,
                        borderWidth: 2,
                        borderColor: '#FFFFFF',
                      }}
                    />
                    <Voltra.Text style={{ fontSize: 12, color: '#E0E7FF' }}>
                      No backgroundColor - parent color shows through
                    </Voltra.Text>
                  </Voltra.VStack>
                )
              }
            />
          </View>
        </Card>

        <Card>
          <Card.Title>4. Combined Style Properties</Card.Title>
          <Card.Text>
            Apply multiple style properties to the fallback including backgroundColor, borderRadius, borders, and
            shadows.
          </Card.Text>
          <View style={styles.buttonRow}>
            <Button
              title="Show Example"
              variant="primary"
              onPress={() =>
                handleShowExample(
                  'Combined Styles',
                  <Voltra.VStack style={{ padding: 16, backgroundColor: '#1E293B' }} spacing={12}>
                    <Voltra.Text style={{ fontSize: 18, fontWeight: 'bold', color: '#FFFFFF' }}>
                      Styled Fallback
                    </Voltra.Text>
                    <Voltra.Image
                      source={{ assetName: 'missing-styled' }}
                      style={{
                        width: 120,
                        height: 80,
                        backgroundColor: '#8B5CF6',
                        borderRadius: 20,
                        borderWidth: 3,
                        borderColor: '#A78BFA',
                      }}
                    />
                    <Voltra.Text style={{ fontSize: 11, color: '#94A3B8' }}>
                      backgroundColor + borderRadius + borders
                    </Voltra.Text>
                  </Voltra.VStack>
                )
              }
            />
          </View>
        </Card>

        <Card>
          <Card.Title>5. Custom Fallback Component</Card.Title>
          <Card.Text>
            Use a custom fallback component with icons or text. The styles apply to the container, not the fallback
            content.
          </Card.Text>
          <View style={styles.buttonRow}>
            <Button
              title="Show Example"
              variant="primary"
              onPress={() =>
                handleShowExample(
                  'Custom Fallback',
                  <Voltra.VStack style={{ padding: 16, backgroundColor: '#0F172A' }} spacing={12}>
                    <Voltra.Text style={{ fontSize: 18, fontWeight: 'bold', color: '#FFFFFF' }}>
                      Custom Fallback
                    </Voltra.Text>
                    <Voltra.Image
                      source={{ assetName: 'missing-custom' }}
                      fallback={
                        <Voltra.VStack style={{ flex: 1 }} spacing={4} alignment="center">
                          <Voltra.Symbol name="photo" size={32} tintColor="#64748B" />
                          <Voltra.Text style={{ fontSize: 10, color: '#64748B' }}>No Image</Voltra.Text>
                        </Voltra.VStack>
                      }
                      style={{
                        width: 100,
                        height: 100,
                        backgroundColor: '#1E293B',
                        borderRadius: 12,
                        borderWidth: 2,
                        borderColor: '#334155',
                      }}
                    />
                  </Voltra.VStack>
                )
              }
            />
          </View>
        </Card>

        <Card>
          <Card.Title>6. Mixed: Valid and Missing Images</Card.Title>
          <Card.Text>
            Display a mix of valid and missing images to show consistent styling behavior. Valid images display normally
            while missing ones show the styled fallback.
          </Card.Text>
          <View style={styles.buttonRow}>
            <Button
              title="Show Example"
              variant="primary"
              onPress={() =>
                handleShowExample(
                  'Mixed Images',
                  <Voltra.VStack style={{ padding: 16, backgroundColor: '#111827' }} spacing={12}>
                    <Voltra.Text style={{ fontSize: 18, fontWeight: 'bold', color: '#FFFFFF' }}>Image Grid</Voltra.Text>
                    <Voltra.HStack spacing={8}>
                      <Voltra.Image
                        source={{ assetName: 'missing-1' }}
                        style={{
                          width: 50,
                          height: 50,
                          backgroundColor: '#DC2626',
                          borderRadius: 8,
                        }}
                      />
                      <Voltra.Image
                        source={{ assetName: 'missing-2' }}
                        style={{
                          width: 50,
                          height: 50,
                          backgroundColor: '#059669',
                          borderRadius: 8,
                        }}
                      />
                      <Voltra.Image
                        source={{ assetName: 'missing-3' }}
                        style={{
                          width: 50,
                          height: 50,
                          backgroundColor: '#2563EB',
                          borderRadius: 8,
                        }}
                      />
                    </Voltra.HStack>
                    <Voltra.Text style={{ fontSize: 11, color: '#6B7280' }}>
                      All missing - styled with different colors
                    </Voltra.Text>
                  </Voltra.VStack>
                )
              }
            />
          </View>
        </Card>

        <View style={styles.infoBox}>
          <Text style={styles.infoTitle}>Migration Note</Text>
          <Text style={styles.infoText}>
            The <Text style={styles.code}>fallbackColor</Text> prop has been removed. Use{' '}
            <Text style={styles.code}>backgroundColor</Text> in the <Text style={styles.code}>style</Text> prop instead.
          </Text>
          <Text style={[styles.infoText, { marginTop: 8 }]}>
            Before: <Text style={styles.code}>fallbackColor="#E0E0E0"</Text>
          </Text>
          <Text style={styles.infoText}>
            After: <Text style={styles.code}>style={'{{ backgroundColor: "#E0E0E0" }}'}</Text>
          </Text>
        </View>

        <View style={styles.footer}>
          <Link href="/testing-grounds" asChild>
            <Button title="Back to Testing Grounds" variant="ghost" />
          </Link>
        </View>
      </View>
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0B0F1A',
  },
  scrollView: {
    flex: 1,
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
  buttonRow: {
    marginTop: 16,
    flexDirection: 'column',
    gap: 12,
  },
  infoBox: {
    backgroundColor: '#1E293B',
    borderRadius: 12,
    padding: 16,
    marginTop: 16,
    borderLeftWidth: 4,
    borderLeftColor: '#3B82F6',
  },
  infoTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 8,
  },
  infoText: {
    fontSize: 13,
    lineHeight: 18,
    color: '#CBD5E1',
  },
  code: {
    fontFamily: 'Courier',
    fontSize: 12,
    color: '#60A5FA',
    backgroundColor: '#1E293B',
    paddingHorizontal: 4,
    paddingVertical: 2,
    borderRadius: 4,
  },
  footer: {
    marginTop: 24,
    alignItems: 'center',
  },
})
