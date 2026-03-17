import React from 'react'
import { brotliDecompressSync } from 'zlib'

import { HStack } from '../jsx/HStack'
import { Image } from '../jsx/Image'
import { Text } from '../jsx/Text'
import { VStack } from '../jsx/VStack'
import { renderLiveActivityToString, renderWidgetToString } from '../server'

function parsePayload(base64: string) {
  const buffer = Buffer.from(base64, 'base64')
  const decompressed = brotliDecompressSync(buffer)
  return JSON.parse(decompressed.toString('utf8'))
}

describe('E2E', () => {
  test('Full Live Activity render', async () => {
    const variants = {
      lockScreen: <Text>LS</Text>,
      island: {
        expanded: { center: <Text>C</Text> },
        compact: { leading: <Text>L</Text>, trailing: <Text>T</Text> },
        minimal: <Text>M</Text>,
      },
    }
    const output = await renderLiveActivityToString(variants)
    expect(typeof output).toBe('string')
    expect(output.length).toBeGreaterThan(0)
    expect(() => parsePayload(output)).not.toThrow()
  })

  test('Full Widget render', () => {
    const variants = {
      systemSmall: <Text>S</Text>,
      systemMedium: <Text>M</Text>,
      systemLarge: <Text>L</Text>,
      systemExtraLarge: <Text>XL</Text>,
      accessoryCircular: <Text>AC</Text>,
      accessoryRectangular: <Text>AR</Text>,
      accessoryInline: <Text>AI</Text>,
    }
    const output = renderWidgetToString(variants)
    expect(typeof output).toBe('string')
    const json = JSON.parse(output)
    expect(json).toHaveProperty('systemSmall')
    expect(json).toHaveProperty('accessoryInline')
  })

  test('Complex nested UI', async () => {
    const ui = (
      <VStack>
        <HStack>
          <Image source={{ assetName: 'icon' }} />
          <Text>Title</Text>
        </HStack>
        <Text>Description text that is somewhat long but reasonable.</Text>
        <HStack>
          <Text>Status: OK</Text>
        </HStack>
      </VStack>
    )
    const output = await renderLiveActivityToString({ lockScreen: ui })
    const buffer = Buffer.from(output, 'base64')
    expect(buffer.length).toBeLessThan(3345)
  })

  test('Payload roundtrip', async () => {
    const ui = <Text>Hello</Text>
    const output = await renderLiveActivityToString({ lockScreen: ui })
    const json = parsePayload(output)

    expect(json).toHaveProperty('ls')
    expect(json.ls.c).toBe('Hello')
  })
})
