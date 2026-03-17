import React from 'react'

import { renderVoltraVariantToJson } from '../../renderer/renderer'
import { Button } from '../Button'
import { HStack } from '../HStack'
import { Text } from '../Text'

describe('Button Component', () => {
  test('1. Basic button', () => {
    // Render <Button>Click</Button>. Verify output has type 'Button' and contains children.
    // Button type id? 'btn'?
    const output = renderVoltraVariantToJson(
      <Button>
        <Text>Click</Text>
      </Button>
    )
    // Need to know button type id. Likely 'btn'.
    // Or check for 't' property.
    // And 'c' has content.
    expect(output).toHaveProperty('c')
    // Children should be Text element.
  })

  test('2. Button with ID', () => {
    // Render <Button id="my-btn">Click</Button>. Verify output props include id: 'my-btn'.
    // id prop is special, mapped to 'i'.
    const output = renderVoltraVariantToJson(
      <Button id="my-btn">
        <Text>Click</Text>
      </Button>
    )
    expect(output.i).toBe('my-btn')
  })

  test('3. Button intent', () => {
    // Render <Button intent="pause">.
    const output = renderVoltraVariantToJson(
      <Button intent="pause">
        <Text>x</Text>
      </Button>
    )
    // intent is prop. Shortened?
    // check short-names.ts or just check existence.
    // Assuming 'intent' is not shortened or is 'intent'.
    // If it's not in short-names, it is 'intent'.
    expect(output.p).toHaveProperty('intent', 'pause')
  })

  test('4. All button styles', () => {
    // Render with each valid buttonStyle value.
    // buttonStyle -> bs
    const output = renderVoltraVariantToJson(
      <Button buttonStyle="borderedProminent">
        <Text>x</Text>
      </Button>
    )
    expect(output.p.bs).toBe('borderedProminent')
  })

  test('5. Button with payload', () => {
    // Render <Button payload={{ action: 'stop', value: 42 }}>.
    // payload prop. Shortened? Not in list -> 'payload'.
    const payload = { action: 'stop', value: 42 }
    const output = renderVoltraVariantToJson(
      <Button payload={payload}>
        <Text>x</Text>
      </Button>
    )
    expect(output.p.payload).toEqual(payload)
  })

  test('6. Nested content', () => {
    // Render <Button><HStack><Text>A</Text><Text>B</Text></HStack></Button>.
    const output = renderVoltraVariantToJson(
      <Button>
        <HStack>
          <Text>A</Text>
          <Text>B</Text>
        </HStack>
      </Button>
    )
    // Children should be HStack
    expect(output.c).toBeDefined()
    // Check structure
  })
})
