import { resolve } from '../index'
import type { AppIntentParams, DeviceState } from '../index'

// Simulates the compact JSON payload the server renderer produces from:
//   <Voltra.Text style={{ color: appIntentParam('city'), ... }}>
//     {appIntentParam('city')}
//   </Voltra.Text>
//
// In practice the payload is rendered by packages/ios/src/widgets/renderer.ts,
// but since light-dark() and {{ appIntent.X }} pass through the server unchanged
// (confirmed in renderer.ts → transformProps / compressStyleObject), we test
// resolve() directly against a representative payload shape.

const makePayload = (): Record<string, unknown> => ({
  v: 1,
  systemSmall: {
    t: 11, // VStack
    c: [
      {
        t: 0, // Text
        c: '{{ appIntent.city }}',
        p: { c: 'light-dark(#111111, #eeeeee)', fs: 22, fw: '700' },
      },
      {
        t: 0,
        c: 'Reactive Weather',
        p: { c: 'light-dark(#666666, #999999)', fs: 14, mt: 6 },
      },
    ],
    p: { pad: 16, al: 'leading', fl: 1 },
  },
  systemMedium: {
    t: 11,
    c: [
      {
        t: 0,
        c: '{{ appIntent.city }}',
        p: { c: 'light-dark(#111111, #eeeeee)', fs: 22, fw: '700' },
      },
    ],
    p: { pad: 16, al: 'leading', fl: 1 },
  },
})

const lightState: DeviceState = { colorScheme: 'light', widgetRenderingMode: 'fullColor' }
const darkState: DeviceState = { colorScheme: 'dark', widgetRenderingMode: 'fullColor' }
const accentedState: DeviceState = { colorScheme: 'light', widgetRenderingMode: 'accented' }

const cityParams: AppIntentParams = { city: 'Warsaw' }
const emptyParams: AppIntentParams = {}

describe('resolve — appIntentParam template substitution', () => {
  test('replaces {{ appIntent.city }} with the configured city', () => {
    const result = resolve(makePayload(), lightState, cityParams)
    const small = result['systemSmall'] as any
    expect(small.c[0].c).toBe('Warsaw')
  })

  test('replaces template in all families', () => {
    const result = resolve(makePayload(), lightState, cityParams)
    const medium = result['systemMedium'] as any
    expect(medium.c[0].c).toBe('Warsaw')
  })

  test('replaces unknown param with empty string', () => {
    const result = resolve(makePayload(), lightState, emptyParams)
    const small = result['systemSmall'] as any
    expect(small.c[0].c).toBe('')
  })
})

describe('resolve — light-dark() color resolution', () => {
  test('picks light color in light mode', () => {
    const result = resolve(makePayload(), lightState, cityParams)
    const small = result['systemSmall'] as any
    expect(small.c[0].p.c).toBe('#111111')
    expect(small.c[1].p.c).toBe('#666666')
  })

  test('picks dark color in dark mode', () => {
    const result = resolve(makePayload(), darkState, cityParams)
    const small = result['systemSmall'] as any
    expect(small.c[0].p.c).toBe('#eeeeee')
    expect(small.c[1].p.c).toBe('#999999')
  })

  test('accented rendering mode does not break light-dark resolution', () => {
    const result = resolve(makePayload(), accentedState, cityParams)
    const small = result['systemSmall'] as any
    expect(small.c[0].p.c).toBe('#111111')
  })
})

describe('resolve — passthrough keys', () => {
  test('v (version) is not traversed', () => {
    const result = resolve(makePayload(), lightState, cityParams)
    expect(result['v']).toBe(1)
  })

  test('non-string numeric props are preserved', () => {
    const result = resolve(makePayload(), lightState, cityParams)
    const small = result['systemSmall'] as any
    expect(small.c[0].p.fs).toBe(22)
  })
})

describe('resolve — end-to-end round-trip', () => {
  test('resolved payload can be serialised to JSON and back', () => {
    const result = resolve(makePayload(), lightState, cityParams)
    const json = JSON.stringify(result)
    const parsed = JSON.parse(json)
    expect(parsed.systemSmall.c[0].c).toBe('Warsaw')
    expect(parsed.systemSmall.c[0].p.c).toBe('#111111')
  })

  test('same payload, different device states, produce different outputs', () => {
    const lightResult = resolve(makePayload(), lightState, cityParams)
    const darkResult = resolve(makePayload(), darkState, cityParams)
    const lightSmall = lightResult['systemSmall'] as any
    const darkSmall = darkResult['systemSmall'] as any
    expect(lightSmall.c[0].p.c).not.toBe(darkSmall.c[0].p.c)
  })
})