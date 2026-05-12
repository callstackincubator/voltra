import React from 'react'

import { Voltra } from '@use-voltra/ios'
import { createVoltraRenderer } from '../renderer/renderer'

const { Text } = Voltra

describe('Stylesheet Deduplication', () => {
  test('1. Same style object reference', () => {
    const style = { backgroundColor: 'red' }
    const renderer = createVoltraRenderer()
    renderer.addRootNode(
      'root',
      <>
        <Text style={style}>A</Text>
        <Text style={style}>B</Text>
      </>
    )
    const result = renderer.render()

    expect(result.s).toHaveLength(1)
    const childA = (result.root as any[]).find((n) => n.c === 'A')
    const childB = (result.root as any[]).find((n) => n.c === 'B')
    const propsA = childA.p
    const propsB = childB.p
    const styleKeyA = Object.keys(propsA).find((k) => propsA[k] === 0)
    const styleKeyB = Object.keys(propsB).find((k) => propsB[k] === 0)

    expect(styleKeyA).toBeDefined()
    expect(styleKeyB).toBeDefined()
    expect(styleKeyA).toBe(styleKeyB)
  })

  test('2. Same style content, different refs', () => {
    const renderer = createVoltraRenderer()
    renderer.addRootNode(
      'root',
      <>
        <Text style={{ color: 'red' }}>A</Text>
        <Text style={{ color: 'red' }}>B</Text>
      </>
    )
    const result = renderer.render()

    expect(result.s).toHaveLength(2)
  })

  test('3. Nested style objects', () => {
    const renderer = createVoltraRenderer()
    const style = { transform: [{ rotate: '45deg' }] }
    renderer.addRootNode('root', <Text style={style}>A</Text>)
    const result = renderer.render()

    expect(result.s).toHaveLength(1)
    const storedStyle = result.s[0]
    expect(JSON.stringify(storedStyle)).toContain('45deg')
  })

  test('4. Empty style object', () => {
    const renderer = createVoltraRenderer()
    renderer.addRootNode('root', <Text style={{}}>A</Text>)
    const result = renderer.render()

    if (result.s) {
    }
  })

  test('5. Style with all properties', () => {
    const style = { backgroundColor: 'red', margin: 10, fontSize: 12 }
    const renderer = createVoltraRenderer()
    renderer.addRootNode('root', <Text style={style}>A</Text>)
    const result = renderer.render()

    const stored = result.s[0]
    expect(stored).not.toHaveProperty('backgroundColor')
    expect(stored).not.toHaveProperty('margin')
    expect(stored).not.toHaveProperty('fontSize')
  })

  test('6. Array styles', () => {
    const renderer = createVoltraRenderer()
    const styleA = { color: 'red' }
    const styleB = { fontSize: 16 }
    renderer.addRootNode('root', <Text style={[styleA, styleB]}>A</Text>)
    const result = renderer.render()

    expect(result.s).toHaveLength(1)
    const stored = result.s[0]
    expect(Object.values(stored)).toContain('red')
    expect(Object.values(stored)).toContain(16)
  })

  test('7. Undefined style', () => {
    const renderer = createVoltraRenderer()
    renderer.addRootNode('root', <Text style={undefined}>A</Text>)
    const result = renderer.render()

    expect(result.s).toBeInstanceOf(Array)
  })
})
