import React from 'react'
import { VoltraAndroid, appIntentParam } from '@use-voltra/android'

/**
 * Track 4 PoC — mirror of iOS Track 2's `IosReactiveWeatherWidget`.
 *
 * The server renders this JSX to a compact JSON payload that includes the
 * `appIntentParam('city')` template expression verbatim. At render time inside
 * the Glance widget process, `VoltraJSRenderer` (Hermes) resolves the
 * placeholder against the current AppIntent parameter value — no server push,
 * no app update required for the value change to take effect.
 */
export const AndroidReactiveWeatherWidget = () => (
  <VoltraAndroid.Column style={{ flex: 1, padding: 16, backgroundColor: '#1E293B', cornerRadius: 16 }}>
    <VoltraAndroid.Text style={{ fontSize: 22, fontWeight: 'bold', color: '#FFFFFF' }}>
      {appIntentParam('city')}
    </VoltraAndroid.Text>
    <VoltraAndroid.Spacer style={{ height: 6 }} />
    <VoltraAndroid.Text style={{ fontSize: 14, color: '#CBD5E1' }}>Reactive Weather</VoltraAndroid.Text>
    <VoltraAndroid.Spacer style={{ height: 8 }} />
    <VoltraAndroid.Text style={{ fontSize: 11, color: '#94A3B8' }}>
      Edit "Reactive widget" screen to set your city
    </VoltraAndroid.Text>
  </VoltraAndroid.Column>
)
