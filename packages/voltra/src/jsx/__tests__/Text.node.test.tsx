import React from 'react'

import { renderVoltraVariantToJson } from '../../renderer/renderer'
import { Text } from '../Text'

describe('Text Component', () => {
  test('String child', () => {
    const output = renderVoltraVariantToJson(<Text>Hello</Text>)
    expect(output.c).toBe('Hello')
  })

  test('Number child', () => {
    const output = renderVoltraVariantToJson(<Text>{42}</Text>)
    expect(output.c).toBe('42')
  })

  test('Boolean true', () => {
    const output = renderVoltraVariantToJson(<Text>{true}</Text>)
    expect(output.c).toBe('')
  })

  test('Boolean false', () => {
    const output = renderVoltraVariantToJson(<Text>{false}</Text>)
    expect(output.c).toBe('')
  })

  test('Multiple string children', () => {
    const output = renderVoltraVariantToJson(
      <Text>
        {'Hello'} {'World'}
      </Text>
    )
    expect(output.c).toBe('Hello World')
  })

  test('Nested Text', () => {
    expect(() => {
      renderVoltraVariantToJson(
        <Text>
          <Text>Inner</Text>
        </Text>
      )
    }).toThrow(/must resolve to a string/)
  })

  test('Empty Text', () => {
    const output = renderVoltraVariantToJson(<Text></Text>)
    expect(output.c).toBe('')
  })

  test('Template literal', () => {
    const output = renderVoltraVariantToJson(<Text>{`Count: ${5}`}</Text>)
    expect(output.c).toBe('Count: 5')
  })

  test('Unicode content', () => {
    const output = renderVoltraVariantToJson(<Text>{'🎉 Party'}</Text>)
    expect(output.c).toBe('🎉 Party')
  })

  test('Very long text', () => {
    const longText = 'x'.repeat(10000)
    const output = renderVoltraVariantToJson(<Text>{longText}</Text>)
    expect(output.c).toBe(longText)
  })
})
