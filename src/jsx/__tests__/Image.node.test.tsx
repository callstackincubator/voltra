import React from 'react'

import { renderVoltraVariantToJson } from '../../renderer/renderer'
import { Image } from '../Image'
import { Text } from '../Text'

describe('Image Component', () => {
  test('Asset name source', () => {
    const output = renderVoltraVariantToJson(<Image source={{ assetName: 'photo' }} />)
    expect(output.p.src).toEqual(JSON.stringify({ assetName: 'photo' }))
  })

  test('Base64 source', () => {
    const output = renderVoltraVariantToJson(<Image source={{ base64: 'iVBORw0...' }} />)
    expect(output.p.src).toEqual(JSON.stringify({ base64: 'iVBORw0...' }))
  })

  test('Large base64 source', () => {
    const largeStr = 'a'.repeat(100 * 1024)
    expect(() => {
      const output = renderVoltraVariantToJson(<Image source={{ base64: largeStr }} />)
      expect(output.p.src).toContain(largeStr)
    }).not.toThrow()
  })

  test('Missing source', () => {
    // @ts-ignore
    const output = renderVoltraVariantToJson(<Image />)
    expect(output.p?.src).toBeUndefined()
  })

  test('fallback node', () => {
    const output = renderVoltraVariantToJson(<Image source={{ assetName: 'x' }} fallback={<Text>Missing</Text>} />)
    expect(output.p.flb).toBeDefined()
    expect((output.p.flb as any).t).toBeDefined()
  })

  test('resizeMode cover', () => {
    const output = renderVoltraVariantToJson(<Image resizeMode="cover" source={{ assetName: 'x' }} />)
    expect(output.p.rm).toBe('cover')
  })

  test('resizeMode contain', () => {
    const output = renderVoltraVariantToJson(<Image resizeMode="contain" source={{ assetName: 'x' }} />)
    expect(output.p.rm).toBe('contain')
  })

  test('All resize modes', () => {
    const modes = ['cover', 'contain', 'stretch', 'center']
    modes.forEach((mode) => {
      const output = renderVoltraVariantToJson(<Image resizeMode={mode as any} source={{ assetName: 'x' }} />)
      expect(output.p.rm).toBe(mode)
    })
  })

  test('Invalid resizeMode (type safety)', () => {
    // @ts-ignore
    const output = renderVoltraVariantToJson(<Image resizeMode="invalid" source={{ assetName: 'x' }} />)
    expect(output.p.rm).toBe('invalid')
  })
})
