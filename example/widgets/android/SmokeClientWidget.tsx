import { VoltraAndroid, type WidgetEnvironment } from '@use-voltra/android'

// Phase 0 smoke widget for Track 5 (client-rendered widgets) on Android.
//
// Intentionally minimal — its only job is to exercise React + the @use-voltra/android
// renderer inside a standalone Hermes runtime and read a couple of `env` fields, proving
// the on-device `(props, env) => JSX` path works. Not a real demo widget (that arrives in
// Phase 7). The `'use voltra'` directive marks it as client-rendered.

export const SmokeClientWidget = (_props: object, env: WidgetEnvironment = {} as WidgetEnvironment) => {
  'use voltra'

  const family = env.widgetFamily ?? '?'
  const scheme = env.colorScheme ?? '?'

  return (
    <VoltraAndroid.Column
      style={{ backgroundColor: '#000000', width: '100%', height: '100%', padding: 16 }}
      horizontalAlignment="center-horizontally"
      verticalAlignment="center-vertically"
    >
      <VoltraAndroid.Text style={{ color: '#FFFFFF', fontSize: 14 }}>Smoke OK</VoltraAndroid.Text>
      <VoltraAndroid.Spacer style={{ height: 8 }} />
      <VoltraAndroid.Text style={{ color: '#34D399', fontSize: 11 }}>family: {family}</VoltraAndroid.Text>
      <VoltraAndroid.Text style={{ color: '#94A3B8', fontSize: 11 }}>scheme: {scheme}</VoltraAndroid.Text>
    </VoltraAndroid.Column>
  )
}
