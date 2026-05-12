import { flattenStyle } from '../renderer/flatten-styles'

describe('Flatten Styles', () => {
  test('1. Single style object', () => {
    const style = { color: 'red' }
    expect(flattenStyle(style)).toEqual(style)
  })

  test('2. Array of styles', () => {
    expect(flattenStyle([{ color: 'red' }, { padding: 10 }])).toEqual({ color: 'red', padding: 10 })
  })

  test('3. Nested arrays', () => {
    const input: any = [{ a: 1 }, [{ b: 2 }, [{ c: 3 }]]]
    expect(flattenStyle(input)).toEqual({ a: 1, b: 2, c: 3 })
  })

  test('4. Undefined in array', () => {
    const input: any = [{ a: 1 }, undefined, { b: 2 }]
    expect(flattenStyle(input)).toEqual({ a: 1, b: 2 })
  })

  test('5. Null in array', () => {
    const input: any = [{ a: 1 }, null, { b: 2 }]
    expect(flattenStyle(input)).toEqual({ a: 1, b: 2 })
  })

  test('6. Empty array', () => {
    expect(flattenStyle([])).toEqual({})
  })

  test('7. Override precedence', () => {
    expect(flattenStyle([{ color: 'red' }, { color: 'blue' }])).toEqual({ color: 'blue' })
  })

  test('8. Deep merge', () => {
    const s1 = { nested: { a: 1 } }
    const s2 = { nested: { b: 2 } }
    expect(flattenStyle([s1, s2])).toEqual({ nested: { b: 2 } })
  })
})
