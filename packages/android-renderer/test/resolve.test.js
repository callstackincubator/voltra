const test = require('node:test')
const assert = require('node:assert/strict')

const { resolve } = require('../build/cjs/index.js')

// Simulates the compact JSON payload the server renderer produces from:
//   <VoltraAndroid.Text>{appIntentParam('city')}</VoltraAndroid.Text>
//
// In practice the payload is rendered by packages/android/src/widgets/renderer.ts,
// but since {{ appIntent.X }} expressions pass through the server unchanged,
// we test resolve() directly against a representative payload shape.
const makePayload = () => ({
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

test('resolve — replaces {{ appIntent.city }} with the configured city', () => {
  const result = resolve(makePayload(), { city: 'Warsaw' })
  assert.equal(result.systemSmall.c[0].c, 'Warsaw')
})

test('resolve — replaces template in all families', () => {
  const result = resolve(makePayload(), { city: 'Warsaw' })
  assert.equal(result.systemMedium.c[0].c, 'Warsaw')
})

test('resolve — replaces unknown param with empty string', () => {
  const result = resolve(makePayload(), {})
  assert.equal(result.systemSmall.c[0].c, '')
})

test('resolve — passthrough v (version) is not traversed', () => {
  const result = resolve(makePayload(), { city: 'Warsaw' })
  assert.equal(result.v, 1)
})

test('resolve — non-string numeric props are preserved', () => {
  const result = resolve(makePayload(), { city: 'Warsaw' })
  assert.equal(result.systemSmall.c[0].p.fs, 22)
})

test('resolve — resolved payload can be serialised to JSON and back', () => {
  const result = resolve(makePayload(), { city: 'Warsaw' })
  const parsed = JSON.parse(JSON.stringify(result))
  assert.equal(parsed.systemSmall.c[0].c, 'Warsaw')
})

test('resolve — same payload, different params, produce different outputs', () => {
  const warsaw = resolve(makePayload(), { city: 'Warsaw' })
  const tokyo = resolve(makePayload(), { city: 'Tokyo' })
  assert.notEqual(warsaw.systemSmall.c[0].c, tokyo.systemSmall.c[0].c)
})
