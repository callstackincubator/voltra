import { useRouter } from 'expo-router'
import React, { useState } from 'react'
import { ScrollView, StyleSheet, Text, View } from 'react-native'
import { AndroidWidgetFamily, VoltraWidgetPreview } from 'voltra/android/client'

import { Button } from '~/components/Button'
import { Card } from '~/components/Card'
import { AreaChartWidget, BarChartWidget, LineChartWidget, PieChartWidget } from '~/widgets/AndroidChartWidget'

type ChartType = 'bar' | 'line' | 'area' | 'pie'

const CHART_TYPES: { id: ChartType; title: string; description: string }[] = [
  { id: 'bar', title: 'Bar Chart', description: 'Weekly activity with bars and a reference rule line' },
  { id: 'line', title: 'Line Chart', description: 'Multi-series line chart with data points' },
  { id: 'area', title: 'Area Chart', description: 'Stacked area chart showing traffic by platform' },
  { id: 'pie', title: 'Pie / Donut', description: 'Donut chart showing framework usage breakdown' },
]

const WIDGET_SIZES: { id: AndroidWidgetFamily; title: string }[] = [
  { id: 'mediumWide', title: 'Medium Wide' },
  { id: 'mediumSquare', title: 'Medium Square' },
  { id: 'large', title: 'Large' },
  { id: 'extraLarge', title: 'Extra Large' },
]

function ChartPreview({ chartType }: { chartType: ChartType }) {
  switch (chartType) {
    case 'bar':
      return <BarChartWidget />
    case 'line':
      return <LineChartWidget />
    case 'area':
      return <AreaChartWidget />
    case 'pie':
      return <PieChartWidget />
  }
}

export default function AndroidChartScreen() {
  const router = useRouter()
  const [selectedChart, setSelectedChart] = useState<ChartType>('bar')
  const [selectedSize, setSelectedSize] = useState<AndroidWidgetFamily>('large')

  return (
    <View style={styles.container}>
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.content}>
        <Text style={styles.heading}>Chart Widgets</Text>
        <Text style={styles.subheading}>
          Preview Android chart widgets rendered via Canvas bitmap. Charts are drawn natively using
          android.graphics.Canvas and displayed as a Glance Image.
        </Text>

        <Card>
          <Card.Title>Chart Type</Card.Title>
          <Card.Text>{CHART_TYPES.find((c) => c.id === selectedChart)?.description}</Card.Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.scrollArea}>
            <View style={styles.buttonRow}>
              {CHART_TYPES.map((chart) => (
                <Button
                  key={chart.id}
                  title={chart.title}
                  variant={selectedChart === chart.id ? 'primary' : 'secondary'}
                  onPress={() => setSelectedChart(chart.id)}
                  style={styles.choiceButton}
                />
              ))}
            </View>
          </ScrollView>
        </Card>

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
          <Card.Text>Rendered using the native Glance renderer with Canvas-based chart bitmap.</Card.Text>
          <View style={styles.previewContainer}>
            <View style={styles.previewWrapper}>
              <VoltraWidgetPreview family={selectedSize} style={styles.widgetBorder}>
                <ChartPreview chartType={selectedChart} />
              </VoltraWidgetPreview>
            </View>
          </View>
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
