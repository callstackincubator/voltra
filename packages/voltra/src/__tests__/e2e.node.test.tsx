import React from 'react'
import { brotliDecompressSync } from 'zlib'

import { Voltra } from '@use-voltra/ios'

import { renderLiveActivityToString, renderWidgetToString } from '../server'

function parsePayload(base64: string) {
  const buffer = Buffer.from(base64, 'base64')
  const decompressed = brotliDecompressSync(buffer)
  return JSON.parse(decompressed.toString('utf8'))
}

describe('E2E', () => {
  test('Full Live Activity render', async () => {
    const variants = {
      lockScreen: <Voltra.Text>LS</Voltra.Text>,
      island: {
        expanded: { center: <Voltra.Text>C</Voltra.Text> },
        compact: { leading: <Voltra.Text>L</Voltra.Text>, trailing: <Voltra.Text>T</Voltra.Text> },
        minimal: <Voltra.Text>M</Voltra.Text>,
      },
    }
    const output = await renderLiveActivityToString(variants)
    expect(typeof output).toBe('string')
    expect(output.length).toBeGreaterThan(0)
    expect(() => parsePayload(output)).not.toThrow()
  })

  test('Full Widget render', () => {
    const variants = {
      systemSmall: <Voltra.Text>S</Voltra.Text>,
      systemMedium: <Voltra.Text>M</Voltra.Text>,
      systemLarge: <Voltra.Text>L</Voltra.Text>,
      systemExtraLarge: <Voltra.Text>XL</Voltra.Text>,
      accessoryCircular: <Voltra.Text>AC</Voltra.Text>,
      accessoryRectangular: <Voltra.Text>AR</Voltra.Text>,
      accessoryInline: <Voltra.Text>AI</Voltra.Text>,
    }
    const output = renderWidgetToString(variants)
    expect(typeof output).toBe('string')
    const json = JSON.parse(output)
    expect(json).toHaveProperty('systemSmall')
    expect(json).toHaveProperty('accessoryInline')
  })

  test('Complex nested UI', async () => {
    const ui = (
      <Voltra.VStack>
        <Voltra.HStack>
          <Voltra.Image source={{ assetName: 'icon' }} />
          <Voltra.Text>Title</Voltra.Text>
        </Voltra.HStack>
        <Voltra.Text>Description text that is somewhat long but reasonable.</Voltra.Text>
        <Voltra.HStack>
          <Voltra.Text>Status: OK</Voltra.Text>
        </Voltra.HStack>
      </Voltra.VStack>
    )
    const output = await renderLiveActivityToString({ lockScreen: ui })
    const buffer = Buffer.from(output, 'base64')
    expect(buffer.length).toBeLessThan(3345)
  })

  test('Payload roundtrip', async () => {
    const ui = <Voltra.Text>Hello</Voltra.Text>
    const output = await renderLiveActivityToString({ lockScreen: ui })
    const json = parsePayload(output)

    expect(json).toHaveProperty('ls')
    expect(json.ls.c).toBe('Hello')
  })
})
