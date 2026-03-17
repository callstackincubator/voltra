import { expand, shorten } from '../short-names'

// Helper to simulate object shortening as done in renderer
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
    // Call shorten({ backgroundColor: 'red', marginTop: 10, paddingHorizontal: 20 }).
    // Verify returns { bg: 'red', mt: 10, ph: 20 }.
    const input = { backgroundColor: 'red', marginTop: 10, paddingHorizontal: 20 }
    const output = shortenObject(input)
    expect(output).toEqual({ bg: 'red', mt: 10, ph: 20 })
  })

  test('2. Unknown property', () => {
    // Call shorten({ customProp: 'value' }). Verify customProp is passed through unchanged.
    const input = { customProp: 'value' }
    const output = shortenObject(input)
    expect(output).toEqual({ customProp: 'value' })
  })

  test('3. Nested property paths', () => {
    // Call shorten({ transform: { rotate: '45deg' } }). Verify nested structure preserved with shortened keys where applicable.
    // 'transform' -> 'tf'. 'rotate' -> check if mapped. 'rotate' is NOT in NAME_TO_SHORT list I read. 'rotationEffect' -> 're'.
    // If 'rotate' is not mapped, it stays 'rotate'.
    const input = { transform: { rotate: '45deg' } }
    const output = shortenObject(input)
    // Assuming rotate is not shortened.
    // transform -> tf
    expect(output).toEqual({ tf: { rotate: '45deg' } })
  })

  test('4. Unicode property names', () => {
    // Call shorten({ '日本語': 'value' }). Verify no error, property passed through.
    const input = { 日本語: 'value' }
    const output = shortenObject(input)
    expect(output).toEqual({ 日本語: 'value' })
  })

  test('5. Empty string property', () => {
    // Call shorten({ '': 'value' }). Verify passed through without error.
    const input = { '': 'value' }
    const output = shortenObject(input)
    expect(output).toEqual({ '': 'value' })
  })

  test('6. Numeric property names', () => {
    // Call shorten({ '0': 'value', '1': 'other' }). Verify passed through unchanged.
    const input = { '0': 'value', '1': 'other' }
    const output = shortenObject(input)
    expect(output).toEqual({ '0': 'value', '1': 'other' })
  })

  test('7. Expand then shorten roundtrip', () => {
    // Call expand(shorten({ backgroundColor: 'red' })). Verify returns { backgroundColor: 'red' } - roundtrip is lossless.
    const input = { backgroundColor: 'red' }
    const shortened = shortenObject(input)
    const expanded = expandObject(shortened)
    expect(expanded).toEqual(input)
  })

  test('8. Case sensitivity', () => {
    // Call shorten({ BackgroundColor: 'red', backgroundColor: 'blue' }). Verify only lowercase backgroundColor is shortened to bg, uppercase passed through.
    const input = { BackgroundColor: 'red', backgroundColor: 'blue' }
    const output = shortenObject(input)
    expect(output).toEqual({ BackgroundColor: 'red', bg: 'blue' })
  })
})
