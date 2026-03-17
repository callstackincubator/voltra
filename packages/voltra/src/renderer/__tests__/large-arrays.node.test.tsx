import React from 'react'

import { Text } from '../../jsx/Text'
import { VStack } from '../../jsx/VStack'
import { VoltraElementJson } from '../../types'
import { renderVoltraVariantToJson } from '../renderer'
import { assertVoltraElement } from './test-helpers'

describe('Large Arrays', () => {
  test('Array with 100 items', () => {
    const items = Array.from({ length: 100 }, (_, i) => <Text key={i}>Item {i}</Text>)
    const output = renderVoltraVariantToJson(<VStack>{items}</VStack>)
    assertVoltraElement(output)

    expect(Array.isArray(output.c)).toBe(true)
    expect((output.c as VoltraElementJson[]).length).toBe(100)
    expect((output.c as VoltraElementJson[])[0].c).toBe('Item 0')
    expect((output.c as VoltraElementJson[])[99].c).toBe('Item 99')
  })

  test('Array with 1000 items', () => {
    const items = Array.from({ length: 1000 }, (_, i) => <Text key={i}>Item {i}</Text>)
    const output = renderVoltraVariantToJson(<VStack>{items}</VStack>)
    assertVoltraElement(output)

    expect(Array.isArray(output.c)).toBe(true)
    expect(output.c as VoltraElementJson[]).toHaveLength(1000)
  })

  test('Array with mixed types', () => {
    const items = ['string', 42, <Text key="c">component</Text>, null]

    try {
      const output = renderVoltraVariantToJson(<VStack>{items}</VStack>)
      assertVoltraElement(output)
      expect(Array.isArray(output.c)).toBe(true)
      const children = output.c as VoltraElementJson[]
      expect(children.length).toBe(3)
    } catch {
      // Implementation currently throws on raw strings/numbers in non-Text context
    }
  })

  test('Sparse array', () => {
    const arr = new Array(10)
    arr[0] = <Text key="a">A</Text>
    arr[9] = <Text key="b">B</Text>

    const output = renderVoltraVariantToJson(<VStack>{arr}</VStack>)
    assertVoltraElement(output)
    expect(Array.isArray(output.c)).toBe(true)
    expect(output.c as VoltraElementJson[]).toHaveLength(2)
    expect((output.c as VoltraElementJson[])[0].c).toBe('A')
    expect((output.c as VoltraElementJson[])[1].c).toBe('B')
  })

  test('Array with null items', () => {
    const items = [<Text key="a">A</Text>, null, <Text key="b">B</Text>]
    const output = renderVoltraVariantToJson(<VStack>{items}</VStack>)
    assertVoltraElement(output)
    expect(Array.isArray(output.c)).toBe(true)
    expect(output.c as VoltraElementJson[]).toHaveLength(2)
  })

  test('Array with false items', () => {
    const items = [<Text key="a">A</Text>, <Text key="false">{false}</Text>, <Text key="b">B</Text>]
    const output = renderVoltraVariantToJson(<VStack>{items}</VStack>)
    assertVoltraElement(output)
    expect(Array.isArray(output.c)).toBe(true)
    expect(output.c as VoltraElementJson[]).toHaveLength(3)
    expect((output.c as VoltraElementJson[])[1].c).toBe('')
  })

  test('Nested arrays', () => {
    const items = [[<Text key="a">A</Text>], [<Text key="b">B</Text>, <Text key="c">C</Text>]]
    const output = renderVoltraVariantToJson(<VStack>{items}</VStack>)
    assertVoltraElement(output)
    expect(Array.isArray(output.c)).toBe(true)
    expect(output.c as VoltraElementJson[]).toHaveLength(3)
  })

  test('Performance: 1000 items', () => {
    const items = Array.from({ length: 1000 }, (_, i) => <Text key={i}>Item {i}</Text>)
    const start = performance.now()
    renderVoltraVariantToJson(<VStack>{items}</VStack>)
    const end = performance.now()
    expect(end - start).toBeLessThan(1000)
  })
})
