import { AndroidDynamicColors, VoltraAndroid, type WidgetEnvironment } from '@use-voltra/android'

// Client-rendered Android widget: its JSX runs on-device in Hermes on every render, receiving
// the live `env`. Edit the marker literal below and save — the home-screen widget updates via
// Fast Refresh (dev). Mirrors the iOS ClientRenderedDemoWidget. Themes itself from Material You
// via AndroidDynamicColors tokens, which the native renderer resolves to the system dynamic
// color scheme (and which follow light/dark automatically).

export const AndroidClientDemoWidget = (_props: object, env: WidgetEnvironment = {} as WidgetEnvironment) => {
  'use voltra'

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
    <VoltraAndroid.Box style={{ width: 16, height: 16, backgroundColor: color, cornerRadius: 4 }} />
  )

  return (
    <VoltraAndroid.Column
      style={{ backgroundColor: bg, width: '100%', height: '100%', padding: 12 }}
      verticalAlignment="center-vertically"
    >
      <VoltraAndroid.Text style={{ fontSize: 12, color: fg }}>Client-rendered demo</VoltraAndroid.Text>
      <VoltraAndroid.Text style={{ fontSize: 14, color: accent }}>{hotReloadMarker}</VoltraAndroid.Text>
      <VoltraAndroid.Spacer style={{ height: 6 }} />
      {row('size:', env.widgetFamily ?? '?')}
      {row('scheme:', env.colorScheme ?? '?')}
      {row('locale:', env.locale ?? '?')}
      {row('config:', configLabel)}
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
