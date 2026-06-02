import { useRouter } from 'expo-router'
import React from 'react'
import { StyleSheet, View } from 'react-native'
import { VoltraAndroid } from '@use-voltra/android'
import { AndroidWidgetFamily, VoltraWidgetPreview } from '@use-voltra/android-client'

import { Button } from '~/components/Button'
import { Card } from '~/components/Card'
import { ScreenLayout } from '~/components/ScreenLayout'

const IMAGE = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/p9sAAAAASUVORK5CYII='

const chartData = [
  { x: 'Mon', y: 3 },
  { x: 'Tue', y: 7 },
  { x: 'Wed', y: 5 },
  { x: 'Thu', y: 9 },
]

const areaData = [
  { x: 'Q1', y: 4, series: 'Mobile' },
  { x: 'Q2', y: 7, series: 'Mobile' },
  { x: 'Q3', y: 6, series: 'Mobile' },
  { x: 'Q1', y: 2, series: 'Web' },
  { x: 'Q2', y: 4, series: 'Web' },
  { x: 'Q3', y: 5, series: 'Web' },
]

const sectorData = [
  { value: 40, category: 'Text' },
  { value: 30, category: 'Layout' },
  { value: 20, category: 'Inputs' },
  { value: 10, category: 'Charts' },
]

type ComponentExample = {
  id: string
  title: string
  description: string
  family?: AndroidWidgetFamily
  renderExample: () => React.ReactNode
}

function WidgetExample({
  children,
  family = 'mediumWide',
}: {
  children: React.ReactNode
  family?: AndroidWidgetFamily
}) {
  return (
    <View style={styles.previewContainer}>
      <VoltraWidgetPreview family={family} style={styles.widgetBorder}>
        {children}
      </VoltraWidgetPreview>
    </View>
  )
}

const COMPONENTS_DATA: ComponentExample[] = [
  {
    id: 'text',
    title: 'Text',
    description: 'Displays styled text in Android Glance widgets.',
    renderExample: () => (
      <VoltraAndroid.Box style={styles.widgetRoot}>
        <VoltraAndroid.Column style={styles.panel}>
          <VoltraAndroid.Text style={{ color: '#FFFFFF', fontSize: 18, fontWeight: '700' }}>
            Hello Android
          </VoltraAndroid.Text>
          <VoltraAndroid.Text style={{ color: '#A7F3D0', fontSize: 13 }}>
            Styled with VoltraAndroid.Text
          </VoltraAndroid.Text>
        </VoltraAndroid.Column>
      </VoltraAndroid.Box>
    ),
  },
  {
    id: 'column',
    title: 'Column',
    description: 'Arranges children vertically with Glance alignment props.',
    renderExample: () => (
      <VoltraAndroid.Box style={styles.widgetRoot}>
        <VoltraAndroid.Column
          style={styles.panel}
          horizontalAlignment="center-horizontally"
          verticalAlignment="center-vertically"
        >
          <VoltraAndroid.Text>Top</VoltraAndroid.Text>
          <VoltraAndroid.Text>Middle</VoltraAndroid.Text>
          <VoltraAndroid.Text>Bottom</VoltraAndroid.Text>
        </VoltraAndroid.Column>
      </VoltraAndroid.Box>
    ),
  },
  {
    id: 'row',
    title: 'Row',
    description: 'Arranges children horizontally with Glance alignment props.',
    renderExample: () => (
      <VoltraAndroid.Box style={styles.widgetRoot}>
        <VoltraAndroid.Row style={styles.panel} verticalAlignment="center-vertically">
          <VoltraAndroid.Text>Left</VoltraAndroid.Text>
          <VoltraAndroid.Spacer style={{ width: 12 }} />
          <VoltraAndroid.Text>Center</VoltraAndroid.Text>
          <VoltraAndroid.Spacer style={{ width: 12 }} />
          <VoltraAndroid.Text>Right</VoltraAndroid.Text>
        </VoltraAndroid.Row>
      </VoltraAndroid.Box>
    ),
  },
  {
    id: 'box',
    title: 'Box',
    description: 'Places content inside a single aligned container.',
    renderExample: () => (
      <VoltraAndroid.Box style={styles.widgetRoot}>
        <VoltraAndroid.Box style={[styles.panel, { backgroundColor: '#2563EB' }]} contentAlignment="center">
          <VoltraAndroid.Text style={{ fontWeight: '700', color: '#ffff' }}>Centered content</VoltraAndroid.Text>
        </VoltraAndroid.Box>
      </VoltraAndroid.Box>
    ),
  },
  {
    id: 'spacer',
    title: 'Spacer',
    description: 'Creates fixed or flexible gaps between widget elements.',
    renderExample: () => (
      <VoltraAndroid.Box style={styles.widgetRoot}>
        <VoltraAndroid.Column style={styles.panel}>
          <VoltraAndroid.Text>Top item</VoltraAndroid.Text>
          <VoltraAndroid.Spacer style={{ height: 20 }} />
          <VoltraAndroid.Text>Bottom item</VoltraAndroid.Text>
        </VoltraAndroid.Column>
      </VoltraAndroid.Box>
    ),
  },
  {
    id: 'button',
    title: 'Button',
    description: 'Wraps custom content in a clickable Glance button surface.',
    renderExample: () => (
      <VoltraAndroid.Box style={styles.widgetRoot}>
        <VoltraAndroid.Button style={styles.buttonSurface}>
          <VoltraAndroid.Text style={{ color: '#FFFFFF', fontWeight: '700' }}>Custom Button</VoltraAndroid.Text>
        </VoltraAndroid.Button>
      </VoltraAndroid.Box>
    ),
  },
  {
    id: 'filled-button',
    title: 'FilledButton',
    description: 'Renders a Material filled button with text, colors, and optional icons.',
    renderExample: () => (
      <VoltraAndroid.Box style={styles.widgetRoot}>
        <VoltraAndroid.Box style={styles.panel}>
          <VoltraAndroid.FilledButton text="Filled" backgroundColor="#22C55E" contentColor="#052E16" />
        </VoltraAndroid.Box>
      </VoltraAndroid.Box>
    ),
  },
  {
    id: 'outline-button',
    title: 'OutlineButton',
    description: 'Renders a Material outlined button.',
    renderExample: () => (
      <VoltraAndroid.Box style={styles.widgetRoot}>
        <VoltraAndroid.Box style={styles.panel}>
          <VoltraAndroid.OutlineButton text="Outlined" contentColor="#E0F2FE" />
        </VoltraAndroid.Box>
      </VoltraAndroid.Box>
    ),
  },
  {
    id: 'icon-buttons',
    title: 'CircleIconButton and SquareIconButton',
    description: 'Displays compact icon-only actions in circular and square Material styles.',
    renderExample: () => (
      <VoltraAndroid.Box style={styles.widgetRoot}>
        <VoltraAndroid.Row style={styles.panel} verticalAlignment="center-vertically">
          <VoltraAndroid.CircleIconButton icon={{ base64: IMAGE }} contentDescription="Circle action" />
          <VoltraAndroid.Spacer style={{ width: 12 }} />
          <VoltraAndroid.SquareIconButton icon={{ base64: IMAGE }} contentDescription="Square action" />
        </VoltraAndroid.Row>
      </VoltraAndroid.Box>
    ),
  },
  {
    id: 'image',
    title: 'Image',
    description: 'Displays local, preloaded, or inline image sources with fallback content.',
    renderExample: () => (
      <VoltraAndroid.Box style={styles.widgetRoot}>
        <VoltraAndroid.Row style={styles.panel} verticalAlignment="center-vertically">
          <VoltraAndroid.Image source={{ base64: IMAGE }} resizeMode="stretch" style={styles.image} />
          <VoltraAndroid.Spacer style={{ width: 12 }} />
          <VoltraAndroid.Text>Inline PNG source</VoltraAndroid.Text>
        </VoltraAndroid.Row>
      </VoltraAndroid.Box>
    ),
  },
  {
    id: 'progress',
    title: 'LinearProgressIndicator and CircularProgressIndicator',
    description: 'Shows Material progress indicators in widget layouts.',
    renderExample: () => (
      <VoltraAndroid.Box style={styles.widgetRoot}>
        <VoltraAndroid.Column style={styles.panel}>
          <VoltraAndroid.LinearProgressIndicator color="#38BDF8" backgroundColor="#334155" />
          <VoltraAndroid.Spacer style={{ height: 12 }} />
          <VoltraAndroid.CircularProgressIndicator color="#FBBF24" style={{ width: 40, height: 40 }} />
        </VoltraAndroid.Column>
      </VoltraAndroid.Box>
    ),
  },
  {
    id: 'inputs',
    title: 'Switch, RadioButton, and CheckBox',
    description: 'Renders Glance input controls with checked and enabled states.',
    renderExample: () => (
      <VoltraAndroid.Box style={styles.widgetRoot}>
        <VoltraAndroid.Column style={styles.panel}>
          <VoltraAndroid.Switch id="component-switch" checked />
          <VoltraAndroid.RadioButton id="component-radio" checked />
          <VoltraAndroid.CheckBox id="component-check" checked />
        </VoltraAndroid.Column>
      </VoltraAndroid.Box>
    ),
  },
  {
    id: 'titlebar',
    title: 'TitleBar',
    description: 'Displays a Glance app widget title bar.',
    renderExample: () => (
      <VoltraAndroid.Scaffold backgroundColor="#F8FAFC">
        <VoltraAndroid.TitleBar title="Voltra" />
        <VoltraAndroid.Box style={{ padding: 12 }}>
          <VoltraAndroid.Text style={{ color: '#0F172A' }}>TitleBar inside Scaffold</VoltraAndroid.Text>
        </VoltraAndroid.Box>
      </VoltraAndroid.Scaffold>
    ),
  },
  {
    id: 'scaffold',
    title: 'Scaffold',
    description: 'Provides an Android widget scaffold with background and padding.',
    renderExample: () => (
      <VoltraAndroid.Scaffold backgroundColor="#DCFCE7" horizontalPadding={16}>
        <VoltraAndroid.Column style={{ width: '100%', height: '100%' }} verticalAlignment="center-vertically">
          <VoltraAndroid.Text style={{ color: '#14532D', fontSize: 16, fontWeight: '700' }}>
            Scaffold body
          </VoltraAndroid.Text>
          <VoltraAndroid.Text style={{ color: '#166534' }}>With background color</VoltraAndroid.Text>
        </VoltraAndroid.Column>
      </VoltraAndroid.Scaffold>
    ),
  },
  {
    id: 'lazy-column',
    title: 'LazyColumn',
    description: 'Displays repeated children in a Glance lazy list. Not available in the in-app preview.',
    family: 'mediumSquare',
    renderExample: () => (
      <VoltraAndroid.Box style={styles.widgetRoot}>
        <VoltraAndroid.Column style={styles.previewNotice} verticalAlignment="center-vertically">
          <VoltraAndroid.Text style={styles.previewNoticeTitle}>Preview unavailable</VoltraAndroid.Text>
          <VoltraAndroid.Text style={styles.previewNoticeBody}>
            LazyColumn uses AppWidget collection adapters and can only render in a real Android widget.
          </VoltraAndroid.Text>
        </VoltraAndroid.Column>
      </VoltraAndroid.Box>
    ),
  },
  {
    id: 'lazy-grid',
    title: 'LazyVerticalGrid',
    description:
      'Displays repeated children in fixed or adaptive Glance grid cells. Not available in the in-app preview.',
    family: 'mediumSquare',
    renderExample: () => (
      <VoltraAndroid.Box style={styles.widgetRoot}>
        <VoltraAndroid.Column style={styles.previewNotice} verticalAlignment="center-vertically">
          <VoltraAndroid.Text style={styles.previewNoticeTitle}>Preview unavailable</VoltraAndroid.Text>
          <VoltraAndroid.Text style={styles.previewNoticeBody}>
            LazyVerticalGrid uses AppWidget collection adapters and can only render in a real Android widget.
          </VoltraAndroid.Text>
        </VoltraAndroid.Column>
      </VoltraAndroid.Box>
    ),
  },
  {
    id: 'chart-cartesian',
    title: 'Chart, BarMark, LineMark, AreaMark, PointMark, and RuleMark',
    description: 'Renders Cartesian chart marks into a native Canvas bitmap.',
    family: 'large',
    renderExample: () => (
      <VoltraAndroid.Box style={styles.widgetRoot}>
        <VoltraAndroid.Column style={{ width: '100%', height: '100%', padding: 12 }}>
          <VoltraAndroid.Text style={{ color: '#E2E8F0', fontWeight: '700', marginBottom: 8 }}>
            Activity
          </VoltraAndroid.Text>
          <VoltraAndroid.Chart
            style={{ width: '100%', height: '100%' }}
            foregroundStyleScale={{ Mobile: '#22C55E', Web: '#38BDF8' }}
          >
            <VoltraAndroid.BarMark data={chartData} color="#A78BFA" cornerRadius={4} />
            <VoltraAndroid.LineMark data={chartData} color="#FDE68A" lineWidth={2} />
            <VoltraAndroid.AreaMark data={areaData} />
            <VoltraAndroid.PointMark data={chartData} color="#FFFFFF" symbolSize={5} />
            <VoltraAndroid.RuleMark yValue={6} color="#64748B" lineWidth={1} />
          </VoltraAndroid.Chart>
        </VoltraAndroid.Column>
      </VoltraAndroid.Box>
    ),
  },
  {
    id: 'chart-sector',
    title: 'SectorMark',
    description: 'Renders pie and donut charts with sector marks.',
    family: 'mediumSquare',
    renderExample: () => (
      <VoltraAndroid.Box style={styles.widgetRoot}>
        <VoltraAndroid.Column
          style={{ width: '100%', height: '100%', padding: 12 }}
          horizontalAlignment="center-horizontally"
          verticalAlignment="center-vertically"
        >
          <VoltraAndroid.Text style={{ color: '#E2E8F0', fontWeight: '700', marginBottom: 8 }}>
            Coverage
          </VoltraAndroid.Text>
          <VoltraAndroid.Chart style={{ width: '100%', height: '100%' }}>
            <VoltraAndroid.SectorMark data={sectorData} innerRadius={28} outerRadius={72} angularInset={2} />
          </VoltraAndroid.Chart>
        </VoltraAndroid.Column>
      </VoltraAndroid.Box>
    ),
  },
]

export default function AndroidComponentsScreen() {
  const router = useRouter()

  return (
    <ScreenLayout
      title="Android Components"
      description="Explore all supported VoltraAndroid components rendered through native Android Glance previews."
    >
      {COMPONENTS_DATA.map((item) => (
        <Card key={item.id}>
          <Card.Title>{item.title}</Card.Title>
          <Card.Text>{item.description}</Card.Text>
          <WidgetExample family={item.family}>{item.renderExample()}</WidgetExample>
        </Card>
      ))}

      <View style={styles.footer}>
        <Button title="Back" variant="ghost" onPress={() => router.back()} />
      </View>
    </ScreenLayout>
  )
}

const styles = StyleSheet.create({
  previewContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 10,
  },
  widgetBorder: {
    width: '100%',
    borderRadius: 18,
    overflow: 'hidden',
  },
  widgetRoot: {
    width: '100%',
    height: '100%',
    backgroundColor: '#1E293B',
    padding: 12,
  },
  panel: {
    width: '100%',
    height: '100%',
    padding: 12,
  },
  image: {
    width: 48,
    height: 48,
    borderRadius: 10,
    backgroundColor: '#22C55E',
  },
  buttonSurface: {
    backgroundColor: '#2563EB',
    borderRadius: 12,
    paddingHorizontal: 18,
    paddingVertical: 12,
  },
  previewNotice: {
    width: '100%',
    height: '100%',
    padding: 12,
  },
  previewNoticeTitle: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 8,
  },
  previewNoticeBody: {
    color: '#CBD5E1',
    fontSize: 12,
  },
  footer: {
    marginTop: 24,
    alignItems: 'center',
  },
})
