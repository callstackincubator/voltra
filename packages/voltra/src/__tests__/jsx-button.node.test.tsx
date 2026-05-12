import React from 'react'

import { Voltra } from '@use-voltra/ios'

import { renderVoltraVariantToJson } from '../renderer/renderer'

describe('Button Component', () => {
  test('1. Basic button', () => {
    const output = renderVoltraVariantToJson(
      <Voltra.Button>
        <Voltra.Text>Click</Voltra.Text>
      </Voltra.Button>
    )
    expect(output).toHaveProperty('c')
  })

  test('2. Button with ID', () => {
    const output = renderVoltraVariantToJson(
      <Voltra.Button id="my-btn">
        <Voltra.Text>Click</Voltra.Text>
      </Voltra.Button>
    )
    expect(output.i).toBe('my-btn')
  })

  test('3. Button intent', () => {
    const output = renderVoltraVariantToJson(
      <Voltra.Button intent="pause">
        <Voltra.Text>x</Voltra.Text>
      </Voltra.Button>
    )
    expect(output.p).toHaveProperty('intent', 'pause')
  })

  test('4. All button styles', () => {
    const output = renderVoltraVariantToJson(
      <Voltra.Button buttonStyle="borderedProminent">
        <Voltra.Text>x</Voltra.Text>
      </Voltra.Button>
    )
    expect(output.p.bs).toBe('borderedProminent')
  })

  test('5. Button with payload', () => {
    const payload = { action: 'stop', value: 42 }
    const output = renderVoltraVariantToJson(
      <Voltra.Button payload={payload}>
        <Voltra.Text>x</Voltra.Text>
      </Voltra.Button>
    )
    expect(output.p.payload).toEqual(payload)
  })

  test('6. Nested content', () => {
    const output = renderVoltraVariantToJson(
      <Voltra.Button>
        <Voltra.HStack>
          <Voltra.Text>A</Voltra.Text>
          <Voltra.Text>B</Voltra.Text>
        </Voltra.HStack>
      </Voltra.Button>
    )
    expect(output.c).toBeDefined()
  })
})
