import { VoltraAndroid, type WidgetEnvironment } from '@use-voltra/android'

// Client-rendered Android widget: its JSX runs on-device in Hermes on every render, receiving
// the live `env`. Edit the marker literal below and save — the home-screen widget updates via
// Fast Refresh (dev). Mirrors the iOS ClientRenderedDemoWidget.

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

  const label = { fontSize: 10, color: '#94A3B8' } as const
  const value = { fontSize: 10, color: '#E2E8F0' } as const

  const row = (k: string, v: string) => (
    <VoltraAndroid.Row>
      <VoltraAndroid.Text style={label}>{k} </VoltraAndroid.Text>
      <VoltraAndroid.Text style={value}>{v}</VoltraAndroid.Text>
    </VoltraAndroid.Row>
  )

  return (
    <VoltraAndroid.Column
      style={{ backgroundColor: '#0B1120', width: '100%', height: '100%', padding: 12 }}
      verticalAlignment="center-vertically"
    >
      <VoltraAndroid.Text style={{ fontSize: 12, color: '#FFFFFF' }}>Client-rendered demo</VoltraAndroid.Text>
      <VoltraAndroid.Text style={{ fontSize: 14, color: '#34D399' }}>{hotReloadMarker}</VoltraAndroid.Text>
      <VoltraAndroid.Spacer style={{ height: 6 }} />
      {row('size:', env.widgetFamily ?? '?')}
      {row('scheme:', env.colorScheme ?? '?')}
      {row('locale:', env.locale ?? '?')}
      {row('dev:', String(env.build?.isDev ?? '?'))}
      {row('time:', renderedAt)}
    </VoltraAndroid.Column>
  )
}
