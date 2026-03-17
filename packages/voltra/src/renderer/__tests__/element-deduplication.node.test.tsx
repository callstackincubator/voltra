import React from 'react'

import { HStack } from '../../jsx/HStack'
import { Text } from '../../jsx/Text'
import { VStack } from '../../jsx/VStack'
import { createVoltraRenderer } from '../renderer'

describe('Element Deduplication', () => {
  test('Same element used twice', () => {
    const shared = <Text>Shared</Text>
    const renderer = createVoltraRenderer()
    renderer.addRootNode(
      'root',
      <VStack>
        {shared}
        {shared}
      </VStack>
    )
    const result = renderer.render()

    expect(result.e).toHaveLength(1)
    const root = result.root
    expect(root.c).toHaveLength(2)
    expect(root.c[0]).toEqual({ $r: 0 })
    expect(root.c[1]).toEqual({ $r: 0 })
  })

  test('Same element in different regions', () => {
    const shared = <Text>Shared</Text>
    const renderer = createVoltraRenderer()
    renderer.addRootNode('ls', shared)
    renderer.addRootNode('min', shared)
    const result = renderer.render()

    expect(result.e).toHaveLength(1)
    expect(result.ls).toEqual({ $r: 0 })
    expect(result.min).toEqual({ $r: 0 })
  })

  test('Different elements, same content', () => {
    const renderer = createVoltraRenderer()
    renderer.addRootNode(
      'root',
      <VStack>
        <Text>Hello</Text>
        <Text>Hello</Text>
      </VStack>
    )
    const result = renderer.render()

    expect(result.e).toBeUndefined()
    expect(result.root.c[0]).toEqual({ t: 0, c: 'Hello' })
    expect(result.root.c[1]).toEqual({ t: 0, c: 'Hello' })
  })

  test('Nested duplicate', () => {
    const shared = <Text>Shared</Text>
    const renderer = createVoltraRenderer()
    renderer.addRootNode(
      'root',
      <VStack>
        {shared}
        <HStack>{shared}</HStack>
      </VStack>
    )
    const result = renderer.render()

    expect(result.e).toHaveLength(1)
    expect(result.root.c[0]).toEqual({ $r: 0 })
    expect(result.root.c[1].c).toEqual({ $r: 0 })
  })

  test('Array of same element', () => {
    const shared = <Text>Shared</Text>
    const renderer = createVoltraRenderer()
    renderer.addRootNode('root', <VStack>{[shared, shared, shared]}</VStack>)
    const result = renderer.render()

    expect(result.e).toHaveLength(1)
    expect(result.root.c).toHaveLength(3)
    expect(result.root.c[0]).toEqual({ $r: 0 })
    expect(result.root.c[1]).toEqual({ $r: 0 })
    expect(result.root.c[2]).toEqual({ $r: 0 })
  })

  test('No duplicates', () => {
    const renderer = createVoltraRenderer()
    renderer.addRootNode(
      'root',
      <VStack>
        <Text>A</Text>
        <Text>B</Text>
      </VStack>
    )
    const result = renderer.render()
    expect(result.e).toBeUndefined()
  })

  test('Deep equality not used', () => {
    const a = <Text style={{ color: 'red' }}>X</Text>
    const b = <Text style={{ color: 'red' }}>X</Text>
    const renderer = createVoltraRenderer()
    renderer.addRootNode(
      'root',
      <VStack>
        {a}
        {b}
      </VStack>
    )
    const result = renderer.render()

    expect(result.e).toBeUndefined()
  })
})
