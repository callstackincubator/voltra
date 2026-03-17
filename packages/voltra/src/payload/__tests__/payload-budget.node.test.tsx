import { randomBytes } from 'node:crypto'

import React from 'react'

import { renderLiveActivityToString, Voltra } from '../../server.js'

const generateRandomBase64 = (bytes: number): string => {
  return randomBytes(bytes).toString('base64')
}

describe('Payload budget', () => {
  test('Oversized base64 image', async () => {
    const oversizedBase64 = generateRandomBase64(10000)

    const variants = {
      lockScreen: (
        <Voltra.VStack>
          <Voltra.Image source={{ base64: oversizedBase64 }} />
          <Voltra.Text>This will exceed the budget</Voltra.Text>
        </Voltra.VStack>
      ),
    }

    await expect(renderLiveActivityToString(variants)).rejects.toThrow(/exceeds safe budget/)
  })

  test('Payload within budget', async () => {
    const variants = {
      lockScreen: (
        <Voltra.VStack>
          <Voltra.Image source={{ assetName: 'small-icon' }} />
          <Voltra.Text>Normal sized payload</Voltra.Text>
        </Voltra.VStack>
      ),
    }

    await expect(renderLiveActivityToString(variants)).resolves.toBeDefined()
  })
})
