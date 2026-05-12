import React from 'react'

import { Voltra } from '@use-voltra/ios'

import { renderVoltraVariantToJson } from '../renderer/renderer'

describe('Text Component', () => {
  test('String child', () => {
    const output = renderVoltraVariantToJson(<Voltra.Text>Hello</Voltra.Text>)
    expect(output.c).toBe('Hello')
  })

  test('Number child', () => {
    const output = renderVoltraVariantToJson(<Voltra.Text>{42}</Voltra.Text>)
    expect(output.c).toBe('42')
  })

  test('Boolean true', () => {
    const output = renderVoltraVariantToJson(<Voltra.Text>{true}</Voltra.Text>)
    expect(output.c).toBe('')
  })

  test('Boolean false', () => {
    const output = renderVoltraVariantToJson(<Voltra.Text>{false}</Voltra.Text>)
    expect(output.c).toBe('')
  })

  test('Multiple string children', () => {
    const output = renderVoltraVariantToJson(
      <Voltra.Text>
        {'Hello'} {'World'}
      </Voltra.Text>
    )
    expect(output.c).toBe('Hello World')
  })

  test('Nested Text', () => {
    expect(() => {
      renderVoltraVariantToJson(
        <Voltra.Text>
          <Voltra.Text>Inner</Voltra.Text>
        </Voltra.Text>
      )
    }).toThrow(/must resolve to a string/)
  })

  test('Empty Text', () => {
    const output = renderVoltraVariantToJson(<Voltra.Text></Voltra.Text>)
    expect(output.c).toBe('')
  })

  test('Template literal', () => {
    const output = renderVoltraVariantToJson(<Voltra.Text>{`Count: ${5}`}</Voltra.Text>)
    expect(output.c).toBe('Count: 5')
  })

  test('Unicode content', () => {
    const output = renderVoltraVariantToJson(<Voltra.Text>{'🎉 Party'}</Voltra.Text>)
    expect(output.c).toBe('🎉 Party')
  })

  test('Very long text', () => {
    const longText = 'x'.repeat(10000)
    const output = renderVoltraVariantToJson(<Voltra.Text>{longText}</Voltra.Text>)
    expect(output.c).toBe(longText)
  })
})
