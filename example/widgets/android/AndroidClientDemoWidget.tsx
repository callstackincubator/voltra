import { Platform, StyleSheet } from 'react-native'

import { AndroidDynamicColors, VoltraAndroid, type WidgetEnvironment } from '@use-voltra/android'

// Static styles live outside the element tree; the Material You colors below are resolved
// per render and merged in with StyleSheet.flatten.
const styles = StyleSheet.create({
  container: { width: '100%', height: '100%', padding: Platform.select({ android: 12, default: 16 }) },
  title: { fontSize: 12 },
  marker: { fontSize: 14 },
  swatch: { width: 16, height: 16, borderRadius: 4 },
})

export type AndroidClientDemoWidgetProps = {
  headline?: string
  unreadCount?: number
}

// This Dynamic Widget runs on-device in Hermes on every render. Runtime props are the first
// argument; live device state and app configuration are kept separately in `env`.
export default function AndroidClientDemoWidget(
  props: AndroidClientDemoWidgetProps = {},
  env: WidgetEnvironment = {} as WidgetEnvironment
) {
  // ▼ EDIT THIS LITERAL TO TEST HOT RELOAD ▼
  const hotReloadMarker = 'edit me'
  const headline = props.headline ?? 'No headline yet'
  const unreadCount = props.unreadCount ?? 0

  const date = env.date ? new Date(env.date) : new Date()
  const renderedAt = date.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  })

  const config = env.configuration as Record<string, unknown> | undefined
  const configLabel = typeof config?.label === 'string' ? config.label : '(unset)'

  // Material You tokens — resolved natively from the system dynamic color scheme.
  const bg = AndroidDynamicColors.surface
  const fg = AndroidDynamicColors.onSurface
  const muted = AndroidDynamicColors.onSurfaceVariant
  const accent = AndroidDynamicColors.primary

  const label = { fontSize: 10, color: muted } as const
  const value = { fontSize: 10, color: fg } as const

  const row = (k: string, v: string) => (
    <VoltraAndroid.Row>
      <VoltraAndroid.Text style={label}>{k} </VoltraAndroid.Text>
      <VoltraAndroid.Text style={value}>{v}</VoltraAndroid.Text>
    </VoltraAndroid.Row>
  )

  const swatch = (color: string) => (
    <VoltraAndroid.Box style={StyleSheet.flatten([styles.swatch, { backgroundColor: color }])} />
  )

  return (
    <VoltraAndroid.Column
      style={StyleSheet.flatten([styles.container, { backgroundColor: bg }])}
      verticalAlignment="center-vertically"
    >
      <VoltraAndroid.Text style={StyleSheet.flatten([styles.title, { color: fg }])}>
        Dynamic Widget demo
      </VoltraAndroid.Text>
      <VoltraAndroid.Text style={StyleSheet.flatten([styles.marker, { color: accent }])}>
        {hotReloadMarker}
      </VoltraAndroid.Text>
      <VoltraAndroid.Spacer style={{ height: 6 }} />
      {row('size:', env.widgetFamily ?? '?')}
      {row('scheme:', env.colorScheme ?? '?')}
      {row('locale:', env.locale ?? '?')}
      {row('config:', configLabel)}
      {row('headline:', headline)}
      {row('unread:', String(unreadCount))}
      {row('time:', renderedAt)}
      <VoltraAndroid.Spacer style={{ height: 8 }} />
      <VoltraAndroid.Row>
        {swatch(AndroidDynamicColors.primary)}
        <VoltraAndroid.Spacer style={{ width: 6 }} />
        {swatch(AndroidDynamicColors.secondary)}
        <VoltraAndroid.Spacer style={{ width: 6 }} />
        {swatch(AndroidDynamicColors.tertiary)}
        <VoltraAndroid.Spacer style={{ width: 6 }} />
        {swatch(AndroidDynamicColors.error)}
      </VoltraAndroid.Row>
    </VoltraAndroid.Column>
  )
}
