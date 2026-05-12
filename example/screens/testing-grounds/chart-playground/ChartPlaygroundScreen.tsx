import { Link } from 'expo-router'
import React, { useCallback, useState } from 'react'
import { ScrollView, StyleSheet, Text, View } from 'react-native'
import { Voltra } from '@use-voltra/ios'
import { VoltraView } from '@use-voltra/ios-client'

import { Button } from '~/components/Button'
import { Card } from '~/components/Card'

// ─── data helpers ───────────────────────────────────────────────────────────

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun']

const randomValue = (min: number, max: number) => Math.round(Math.random() * (max - min) + min)

const randomBarData = () => MONTHS.map((m) => ({ x: m, y: randomValue(20, 120) }))

const randomMultiSeriesData = () => [
  ...MONTHS.map((m) => ({ x: m, y: randomValue(20, 100), series: 'A' })),
  ...MONTHS.map((m) => ({ x: m, y: randomValue(20, 100), series: 'B' })),
]

const randomLineData = () => MONTHS.map((m) => ({ x: m, y: randomValue(30, 100) }))

const randomAreaData = () => MONTHS.map((m) => ({ x: m, y: randomValue(10, 90) }))

const randomPointData = () => Array.from({ length: 12 }, (_, i) => ({ x: randomValue(0, 100), y: randomValue(0, 100) }))

const randomSectorData = () => {
  const raw = [
    { category: 'Work', value: randomValue(20, 50) },
    { category: 'Sleep', value: randomValue(20, 40) },
    { category: 'Leisure', value: randomValue(10, 30) },
    { category: 'Exercise', value: randomValue(5, 20) },
  ]
  return raw
}

const randomRuleY = () => randomValue(30, 80)
const randomRuleX = () => MONTHS[randomValue(0, MONTHS.length - 1)] ?? MONTHS[0]
const randomPointRuleY = () => randomValue(0, 100)
const randomPointRuleX = () => randomValue(0, 100)

// ─── chart preview wrapper ───────────────────────────────────────────────────

function ChartPreview({ children }: { children: React.ReactNode }) {
  return <VoltraView style={{ width: '100%', height: 220, marginTop: 12 }}>{children}</VoltraView>
}

// ─── screen ─────────────────────────────────────────────────────────────────

export default function ChartPlaygroundScreen() {
  const [barData, setBarData] = useState(randomBarData)
  const [multiData, setMultiData] = useState(randomMultiSeriesData)
  const [lineData, setLineData] = useState(randomLineData)
  const [areaData, setAreaData] = useState(randomAreaData)
  const [pointData, setPointData] = useState(randomPointData)
  const [pointRuleY, setPointRuleY] = useState(randomPointRuleY)
  const [pointRuleX, setPointRuleX] = useState(randomPointRuleX)
  const [sectorData, setSectorData] = useState(randomSectorData)
  const [ruleY, setRuleY] = useState(randomRuleY)
  const [ruleX, setRuleX] = useState(randomRuleX)
  const [comboBarData, setComboBarData] = useState(randomBarData)
  const [comboLineData, setComboLineData] = useState(randomLineData)

  const randomizeAll = useCallback(() => {
    setBarData(randomBarData())
    setMultiData(randomMultiSeriesData())
    setLineData(randomLineData())
    setAreaData(randomAreaData())
    setPointData(randomPointData())
    setPointRuleY(randomPointRuleY())
    setPointRuleX(randomPointRuleX())
    setSectorData(randomSectorData())
    setRuleY(randomRuleY())
    setRuleX(randomRuleX())
    setComboBarData(randomBarData())
    setComboLineData(randomLineData())
  }, [])

  return (
    <View style={styles.container}>
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.content}>
        <Text style={styles.heading}>Chart Playground</Text>
        <Text style={styles.subheading}>
          All SwiftUI chart mark types powered by Voltra. Tap Randomize to animate between data sets.
        </Text>

        <View style={styles.randomizeRow}>
          <Button title="🎲 Randomize All" onPress={randomizeAll} variant="primary" />
        </View>

        {/* BarMark */}
        <Card>
          <Card.Title>BarMark</Card.Title>
          <Card.Text>Single series bar chart with rounded corners.</Card.Text>
          <View style={styles.refreshRow}>
            <Button title="Randomize" onPress={() => setBarData(randomBarData())} variant="secondary" />
          </View>
          <ChartPreview>
            <Voltra.Chart
              style={{ width: '100%', height: '100%', color: '#FFFFFF', backgroundColor: '#0F172A' }}
              xAxisVisibility="visible"
              yAxisVisibility="visible"
            >
              <Voltra.BarMark data={barData} color="#4285f4" cornerRadius={4} />
            </Voltra.Chart>
          </ChartPreview>
        </Card>

        {/* BarMark multi-series */}
        <Card>
          <Card.Title>BarMark — Multi-series</Card.Title>
          <Card.Text>
            Two series (A & B) rendered as grouped bars using the supported `stacking` grouped mode.
          </Card.Text>
          <View style={styles.refreshRow}>
            <Button title="Randomize" onPress={() => setMultiData(randomMultiSeriesData())} variant="secondary" />
          </View>
          <ChartPreview>
            <Voltra.Chart
              style={{ width: '100%', height: '100%', color: '#FFFFFF' }}
              yAxisVisibility="visible"
              xAxisVisibility="visible"
              foregroundStyleScale={{ A: '#4285f4', B: '#ea4335' }}
            >
              <Voltra.BarMark data={multiData} stacking="grouped" cornerRadius={4} />
            </Voltra.Chart>
          </ChartPreview>
        </Card>

        {/* LineMark */}
        <Card>
          <Card.Title>LineMark</Card.Title>
          <Card.Text>Smooth monotone line chart.</Card.Text>
          <View style={styles.refreshRow}>
            <Button title="Randomize" onPress={() => setLineData(randomLineData())} variant="secondary" />
          </View>
          <ChartPreview>
            <Voltra.Chart style={{ width: '100%', height: '100%' }}>
              <Voltra.LineMark data={lineData} color="#34a853" interpolation="monotone" lineWidth={2} />
            </Voltra.Chart>
          </ChartPreview>
        </Card>

        {/* AreaMark */}
        <Card>
          <Card.Title>AreaMark</Card.Title>
          <Card.Text>Filled area chart — the classic stocks-app look.</Card.Text>
          <View style={styles.refreshRow}>
            <Button title="Randomize" onPress={() => setAreaData(randomAreaData())} variant="secondary" />
          </View>
          <ChartPreview>
            <Voltra.Chart style={{ width: '100%', height: '100%' }}>
              <Voltra.AreaMark data={areaData} color="#4285f4" interpolation="monotone" />
            </Voltra.Chart>
          </ChartPreview>
        </Card>

        {/* PointMark */}
        <Card>
          <Card.Title>PointMark</Card.Title>
          <Card.Text>
            Scatter plot with numeric x and y axes plus both vertical and horizontal reference lines.
          </Card.Text>
          <View style={styles.refreshRow}>
            <Button
              title="Randomize"
              onPress={() => {
                setPointData(randomPointData())
                setPointRuleY(randomPointRuleY())
                setPointRuleX(randomPointRuleX())
              }}
              variant="secondary"
            />
          </View>
          <ChartPreview>
            <Voltra.Chart
              style={{ width: '100%', height: '100%', color: '#FFFFFF', backgroundColor: '#0F172A' }}
              xAxisVisibility="visible"
              yAxisVisibility="visible"
            >
              <Voltra.PointMark data={pointData} color="#fbbc04" symbolSize={60} />
              <Voltra.RuleMark xValue={pointRuleX} yValue={pointRuleY} color="#ea4335" lineWidth={2} />
            </Voltra.Chart>
          </ChartPreview>
        </Card>

        {/* RuleMark */}
        <Card>
          <Card.Title>RuleMark</Card.Title>
          <Card.Text>
            Bar chart with both horizontal and vertical reference lines. When both `xValue` and `yValue` are set, both
            lines render.
          </Card.Text>
          <View style={styles.refreshRow}>
            <Button
              title="Randomize"
              onPress={() => {
                setBarData(randomBarData())
                setRuleY(randomRuleY())
                setRuleX(randomRuleX())
              }}
              variant="secondary"
            />
          </View>
          <ChartPreview>
            <Voltra.Chart
              style={{ width: '100%', height: '100%', color: '#FFFFFF', backgroundColor: '#0F172A' }}
              xAxisVisibility="visible"
              yAxisVisibility="visible"
            >
              <Voltra.BarMark data={barData} color="#4285f4" cornerRadius={4} />
              <Voltra.RuleMark xValue={ruleX} yValue={ruleY} color="#ea4335" lineWidth={2} />
            </Voltra.Chart>
          </ChartPreview>
        </Card>

        {/* SectorMark — pie */}
        <Card>
          <Card.Title>SectorMark — Pie</Card.Title>
          <Card.Text>Pie chart built with SectorMark (iOS 17+).</Card.Text>
          <View style={styles.refreshRow}>
            <Button title="Randomize" onPress={() => setSectorData(randomSectorData())} variant="secondary" />
          </View>
          <ChartPreview>
            <Voltra.Chart style={{ width: '100%', height: '100%' }}>
              <Voltra.SectorMark data={sectorData} angularInset={2} />
            </Voltra.Chart>
          </ChartPreview>
        </Card>

        {/* SectorMark — donut */}
        <Card>
          <Card.Title>SectorMark — Donut</Card.Title>
          <Card.Text>Same data as above but with an inner radius to create a donut chart.</Card.Text>
          <View style={styles.refreshRow}>
            <Button title="Randomize" onPress={() => setSectorData(randomSectorData())} variant="secondary" />
          </View>
          <ChartPreview>
            <Voltra.Chart
              style={{ width: '100%', height: '100%', color: '#FFFFFF', backgroundColor: '#0F172A' }}
              xAxisVisibility="visible"
              yAxisVisibility="visible"
              legendVisibility="hidden"
            >
              <Voltra.SectorMark data={sectorData} innerRadius={0.5} angularInset={2} />
            </Voltra.Chart>
          </ChartPreview>
        </Card>

        {/* Combo: Bar + Line */}
        <Card>
          <Card.Title>Combo — Bar + Line</Card.Title>
          <Card.Text>Multiple mark types composited in one chart.</Card.Text>
          <View style={styles.refreshRow}>
            <Button
              title="Randomize"
              onPress={() => {
                setComboBarData(randomBarData())
                setComboLineData(randomLineData())
              }}
              variant="secondary"
            />
          </View>
          <ChartPreview>
            <Voltra.Chart
              style={{ width: '100%', height: '100%', color: '#FFFFFF', backgroundColor: '#0F172A' }}
              xAxisVisibility="visible"
              yAxisVisibility="visible"
            >
              <Voltra.BarMark data={comboBarData} color="#4285f4" cornerRadius={4} />
              <Voltra.LineMark data={comboLineData} color="#ea4335" lineWidth={2} interpolation="monotone" />
            </Voltra.Chart>
          </ChartPreview>
        </Card>

        {/* Axis visibility */}
        <Card>
          <Card.Title>Hidden Axes</Card.Title>
          <Card.Text>Chart with both axes hidden — clean minimal look.</Card.Text>
          <ChartPreview>
            <Voltra.Chart
              style={{ width: '100%', height: '100%', color: '#FFFFFF', backgroundColor: '#0F172A' }}
              xAxisVisibility="hidden"
              yAxisVisibility="hidden"
              legendVisibility="hidden"
            >
              <Voltra.AreaMark data={areaData} color="#4285f4" interpolation="monotone" />
            </Voltra.Chart>
          </ChartPreview>
        </Card>

        <View style={styles.footer}>
          <Link href="/testing-grounds" asChild>
            <Button title="Back to Testing Grounds" variant="ghost" />
          </Link>
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
    backgroundColor: '#0F172A',
    marginBottom: 8,
  },
  subheading: {
    fontSize: 14,
    lineHeight: 20,
    color: '#CBD5F5',
    marginBottom: 16,
  },
  randomizeRow: {
    marginBottom: 8,
  },
  refreshRow: {
    marginTop: 8,
    alignItems: 'flex-end',
  },
  footer: {
    marginTop: 24,
    alignItems: 'center',
  },
})
