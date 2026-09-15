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
  city?: string
  temperature?: number
  instance?: string
}

// This Dynamic Widget runs on-device in Hermes on every render. Runtime props are the first
// argument; live device state and app configuration are kept separately in `env`.
export default function AndroidClientDemoWidget(
  props: AndroidClientDemoWidgetProps = {},
  env: WidgetEnvironment = {} as WidgetEnvironment
) {
  // ▼ EDIT THIS LITERAL TO TEST HOT RELOAD ▼
  const hotReloadMarker = 'edit me'

  const date = env.date ? new Date(env.date) : new Date()
  const renderedAt = date.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  })

  const config = env.configuration as Record<string, unknown> | undefined
  const configCity = typeof config?.city === 'string' ? config.city : '(unset)'
  const serverCity = props.city ?? '(no server data)'
  const serverTemp = typeof props.temperature === 'number' ? `${props.temperature}°` : '(no server data)'
  const instanceKey = env.instance ?? '(no instance)'

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
      {/* Jetpack Glance truncates a Column past 10 direct children (see prebuild log warning), so
          this widget keeps only the rows this ADR 0007 demo needs — per-instance city/temperature
          and the raw env.configuration.city / env.instance values — rather than every env field. */}
      {row('env.configuration.city:', configCity)}
      {row('env.instance:', instanceKey)}
      {row('server city:', serverCity)}
      {row('server temp:', serverTemp)}
      {row('time:', renderedAt)}
    </VoltraAndroid.Column>
  )
}
