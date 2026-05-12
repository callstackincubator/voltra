import { expand, shorten } from '@use-voltra/core'

function shortenObject(obj: Record<string, any>): Record<string, any> {
  const result: Record<string, any> = {}
  for (const key of Object.keys(obj)) {
    const shortKey = shorten(key)
    const value = obj[key]
    if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
      result[shortKey] = shortenObject(value)
    } else {
      result[shortKey] = value
    }
  }
  return result
}

function expandObject(obj: Record<string, any>): Record<string, any> {
  const result: Record<string, any> = {}
  for (const key of Object.keys(obj)) {
    const longKey = expand(key)
    const value = obj[key]
    if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
      result[longKey] = expandObject(value)
    } else {
      result[longKey] = value
    }
  }
  return result
}

describe('Short Names', () => {
  test('1. All known properties', () => {
    const input = { backgroundColor: 'red', marginTop: 10, paddingHorizontal: 20 }
    const output = shortenObject(input)
    expect(output).toEqual({ bg: 'red', mt: 10, ph: 20 })
  })

  test('2. Unknown property', () => {
    const input = { customProp: 'value' }
    const output = shortenObject(input)
    expect(output).toEqual({ customProp: 'value' })
  })

  test('3. Nested property paths', () => {
    const input = { transform: { rotate: '45deg' } }
    const output = shortenObject(input)
    expect(output).toEqual({ tf: { rotate: '45deg' } })
  })

  test('4. Unicode property names', () => {
    const input = { 日本語: 'value' }
    const output = shortenObject(input)
    expect(output).toEqual({ 日本語: 'value' })
  })

  test('5. Empty string property', () => {
    const input = { '': 'value' }
    const output = shortenObject(input)
    expect(output).toEqual({ '': 'value' })
  })

  test('6. Numeric property names', () => {
    const input = { '0': 'value', '1': 'other' }
    const output = shortenObject(input)
    expect(output).toEqual({ '0': 'value', '1': 'other' })
  })

  test('7. Expand then shorten roundtrip', () => {
    const input = { backgroundColor: 'red' }
    const shortened = shortenObject(input)
    const expanded = expandObject(shortened)
    expect(expanded).toEqual(input)
  })

  test('8. Case sensitivity', () => {
    const input = { BackgroundColor: 'red', backgroundColor: 'blue' }
    const output = shortenObject(input)
    expect(output).toEqual({ BackgroundColor: 'red', bg: 'blue' })
  })
})
