import { flattenStyle } from '../flatten-styles'

describe('Flatten Styles', () => {
  test('1. Single style object', () => {
    // Call flattenStyle({ color: 'red' }). Verify returns same object or equivalent.
    const style = { color: 'red' }
    expect(flattenStyle(style)).toEqual(style)
  })

  test('2. Array of styles', () => {
    // Call flattenStyle([{ color: 'red' }, { padding: 10 }]). Verify returns merged.
    expect(flattenStyle([{ color: 'red' }, { padding: 10 }])).toEqual({ color: 'red', padding: 10 })
  })

  test('3. Nested arrays', () => {
    // Call flattenStyle([{ a: 1 }, [{ b: 2 }, [{ c: 3 }]]]). Verify recursively flattened.
    const input: any = [{ a: 1 }, [{ b: 2 }, [{ c: 3 }]]]
    expect(flattenStyle(input)).toEqual({ a: 1, b: 2, c: 3 })
  })

  test('4. Undefined in array', () => {
    // Call flattenStyle([{ a: 1 }, undefined, { b: 2 }]). Verify undefined is skipped.
    const input: any = [{ a: 1 }, undefined, { b: 2 }]
    expect(flattenStyle(input)).toEqual({ a: 1, b: 2 })
  })

  test('5. Null in array', () => {
    // Call flattenStyle([{ a: 1 }, null, { b: 2 }]). Verify null is skipped.
    const input: any = [{ a: 1 }, null, { b: 2 }]
    expect(flattenStyle(input)).toEqual({ a: 1, b: 2 })
  })

  test('6. Empty array', () => {
    // Call flattenStyle([]). Verify returns empty object {}.
    expect(flattenStyle([])).toEqual({})
  })

  test('7. Override precedence', () => {
    // Call flattenStyle([{ color: 'red' }, { color: 'blue' }]). Verify later value wins.
    expect(flattenStyle([{ color: 'red' }, { color: 'blue' }])).toEqual({ color: 'blue' })
  })

  test('8. Deep merge', () => {
    // Call flattenStyle([{ nested: { a: 1 } }, { nested: { b: 2 } }]).
    // Verify shallow merge only: { nested: { b: 2 } } (later replaces, not deep merges).
    const s1 = { nested: { a: 1 } }
    const s2 = { nested: { b: 2 } }
    expect(flattenStyle([s1, s2])).toEqual({ nested: { b: 2 } })
  })
})
