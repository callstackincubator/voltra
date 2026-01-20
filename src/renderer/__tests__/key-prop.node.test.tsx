import React from 'react'

import { Text } from '../../jsx/Text'
import { VStack } from '../../jsx/VStack'
import { logger } from '../../logger'
import { VoltraElementJson } from '../../types'
import { renderVoltraVariantToJson } from '../renderer'
import { assertVoltraElement } from './test-helpers'

/**
 * Key Prop Support Tests
 *
 * The 'key' prop provides React-like list identity management for Voltra elements.
 *
 * Behavior:
 * - Keys are extracted from React elements and stored in the 'k' field
 * - On SwiftUI side, keys are used for .id() modifier for view identity
 * - For single elements: key provides stable identity across re-renders
 * - For array elements: key is used in ForEach for proper list reconciliation
 * - The 'id' property is separate and NOT used for view identity
 * - In development mode, warns when array elements lack keys (2+ items)
 */
describe('Key Prop Support', () => {
  beforeEach(() => {
    jest.spyOn(logger, 'warn').mockClear()
  })

  afterEach(() => {
    jest.restoreAllMocks()
  })

  test('extracts key from element', () => {
    const output = renderVoltraVariantToJson(<Text key="item-1">First</Text>)
    assertVoltraElement(output)
    expect(output.k).toBe('item-1')
  })

  test('key and id can coexist (only key used for view identity)', () => {
    // Both key and id can be present on the same element
    // However, only key is used for SwiftUI .id() modifier for view identity
    // The id property serves other purposes (accessibility, etc.)
    const output = renderVoltraVariantToJson(
      <Text key="k1" id="id1">
        Hello
      </Text>
    )
    assertVoltraElement(output)
    expect(output.k).toBe('k1')
    expect(output.i).toBe('id1')
  })

  test('id property does not affect view identity', () => {
    // Element with id but no key - id is stored but NOT used for .id() modifier
    const output = renderVoltraVariantToJson(<Text id="test-id">Hello</Text>)
    assertVoltraElement(output)
    expect(output.i).toBe('test-id')
    expect('k' in output).toBe(false)
  })

  test('array items with keys', () => {
    const items = ['a', 'b', 'c'].map((letter) => <Text key={letter}>Letter {letter}</Text>)
    const output = renderVoltraVariantToJson(<VStack>{items}</VStack>)
    assertVoltraElement(output)
    expect(Array.isArray(output.c)).toBe(true)
    const children = output.c as VoltraElementJson[]
    expect(children[0].k).toBe('a')
    expect(children[1].k).toBe('b')
    expect(children[2].k).toBe('c')
  })

  test('warns on missing keys in development', () => {
    const mockWarn = jest.spyOn(logger, 'warn')
    // eslint-disable-next-line react/jsx-key
    const items = [<Text>A</Text>, <Text>B</Text>]
    renderVoltraVariantToJson(<VStack>{items}</VStack>)
    expect(mockWarn).toHaveBeenCalledWith(expect.stringContaining('should have a unique "key" prop'))
  })

  test('prints warning message for array without keys', () => {
    const mockWarn = jest.spyOn(logger, 'warn')
    // eslint-disable-next-line react/jsx-key
    const items = [<Text>Item 1</Text>, <Text>Item 2</Text>, <Text>Item 3</Text>]
    renderVoltraVariantToJson(<VStack>{items}</VStack>)

    expect(mockWarn).toHaveBeenCalledTimes(1)
    expect(mockWarn).toHaveBeenCalledWith(
      'Each child in an array should have a unique "key" prop. Keys help Voltra identify which items have changed, are added, or removed.'
    )
  })

  test('does not print warning when array has keys', () => {
    const mockWarn = jest.spyOn(logger, 'warn')
    const items = [<Text key="item-1">Item 1</Text>, <Text key="item-2">Item 2</Text>, <Text key="item-3">Item 3</Text>]
    renderVoltraVariantToJson(<VStack>{items}</VStack>)

    expect(mockWarn).not.toHaveBeenCalled()
  })

  test('does not warn for single item', () => {
    const mockWarn = jest.spyOn(logger, 'warn')
    renderVoltraVariantToJson(
      <VStack>
        <Text>Single</Text>
      </VStack>
    )
    expect(mockWarn).not.toHaveBeenCalled()
  })

  test('does not warn when all items have keys', () => {
    const mockWarn = jest.spyOn(logger, 'warn')
    const items = [<Text key="a">A</Text>, <Text key="b">B</Text>]
    renderVoltraVariantToJson(<VStack>{items}</VStack>)
    expect(mockWarn).not.toHaveBeenCalled()
  })

  test('does not warn for string context', () => {
    const mockWarn = jest.spyOn(logger, 'warn')
    renderVoltraVariantToJson(<Text>{['string1', 'string2']}</Text>)
    expect(mockWarn).not.toHaveBeenCalled()
  })

  test('omits key field when not provided', () => {
    const output = renderVoltraVariantToJson(<Text>No key</Text>)
    assertVoltraElement(output)
    expect('k' in output).toBe(false)
  })

  test('key preserved in large arrays', () => {
    const items = Array.from({ length: 100 }, (_, i) => <Text key={`item-${i}`}>Item {i}</Text>)
    const output = renderVoltraVariantToJson(<VStack>{items}</VStack>)
    assertVoltraElement(output)
    expect(Array.isArray(output.c)).toBe(true)
    const children = output.c as VoltraElementJson[]
    expect(children[0].k).toBe('item-0')
    expect(children[50].k).toBe('item-50')
    expect(children[99].k).toBe('item-99')
  })

  test('handles mixed keyed and non-keyed items', () => {
    const mockWarn = jest.spyOn(logger, 'warn')
    const items = [
      <Text key="a">A</Text>,
      // eslint-disable-next-line react/jsx-key
      <Text>B</Text>,
      <Text key="c">C</Text>,
    ]
    const output = renderVoltraVariantToJson(<VStack>{items}</VStack>)
    assertVoltraElement(output)
    expect(Array.isArray(output.c)).toBe(true)
    const children = output.c as VoltraElementJson[]
    assertVoltraElement(children[0])
    assertVoltraElement(children[1])
    assertVoltraElement(children[2])
    expect(children[0].k).toBe('a')
    expect('k' in children[1]).toBe(false)
    expect(children[2].k).toBe('c')
    // Does not warn because at least some items have keys
    expect(mockWarn).not.toHaveBeenCalled()
  })

  test('allows empty string as key', () => {
    const output = renderVoltraVariantToJson(<Text key="">Empty key</Text>)
    assertVoltraElement(output)
    expect(output.k).toBe('')
  })

  test('numeric key converted to string by React', () => {
    // React converts numeric keys to strings
    const output = renderVoltraVariantToJson(<Text key={123}>Item</Text>)
    // React converts numeric key to string '123'
    assertVoltraElement(output)
    expect(output.k).toBe('123')
  })
})
