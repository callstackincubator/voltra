import { resolve } from '../index'
import type { AppIntentParams } from '../index'

// Simulates the compact JSON payload the server renderer produces from:
//   <Voltra.Text>{appIntentParam('city')}</Voltra.Text>
//
// In practice the payload is rendered by packages/ios/src/widgets/renderer.ts,
// but since {{ appIntent.X }} expressions pass through the server unchanged
// (confirmed in renderer.ts → transformProps), we test resolve() directly
// against a representative payload shape.

const makePayload = (): Record<string, unknown> => ({
  v: 1,
  systemSmall: {
    t: 11, // VStack
    c: [
      {
        t: 0, // Text
        c: '{{ appIntent.city }}',
        p: { fs: 22, fw: '700' },
      },
      {
        t: 0,
        c: 'Reactive Weather',
        p: { fs: 14, mt: 6 },
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
        p: { fs: 22, fw: '700' },
      },
    ],
    p: { pad: 16, al: 'leading', fl: 1 },
  },
})

const cityParams: AppIntentParams = { city: 'Warsaw' }
const emptyParams: AppIntentParams = {}

describe('resolve — appIntentParam template substitution', () => {
  test('replaces {{ appIntent.city }} with the configured city', () => {
    const result = resolve(makePayload(), cityParams)
    const small = result['systemSmall'] as any
    expect(small.c[0].c).toBe('Warsaw')
  })

  test('replaces template in all families', () => {
    const result = resolve(makePayload(), cityParams)
    const medium = result['systemMedium'] as any
    expect(medium.c[0].c).toBe('Warsaw')
  })

  test('replaces unknown param with empty string', () => {
    const result = resolve(makePayload(), emptyParams)
    const small = result['systemSmall'] as any
    expect(small.c[0].c).toBe('')
  })
})

describe('resolve — passthrough keys', () => {
  test('v (version) is not traversed', () => {
    const result = resolve(makePayload(), cityParams)
    expect(result['v']).toBe(1)
  })

  test('non-string numeric props are preserved', () => {
    const result = resolve(makePayload(), cityParams)
    const small = result['systemSmall'] as any
    expect(small.c[0].p.fs).toBe(22)
  })
})

describe('resolve — end-to-end round-trip', () => {
  test('resolved payload can be serialised to JSON and back', () => {
    const result = resolve(makePayload(), cityParams)
    const json = JSON.stringify(result)
    const parsed = JSON.parse(json)
    expect(parsed.systemSmall.c[0].c).toBe('Warsaw')
  })

  test('same payload, different params, produce different outputs', () => {
    const warsawResult = resolve(makePayload(), { city: 'Warsaw' })
    const tokyoResult = resolve(makePayload(), { city: 'Tokyo' })
    const warsawSmall = warsawResult['systemSmall'] as any
    const tokyoSmall = tokyoResult['systemSmall'] as any
    expect(warsawSmall.c[0].c).not.toBe(tokyoSmall.c[0].c)
  })
})
