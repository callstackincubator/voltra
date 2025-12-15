import { randomBytes } from 'node:crypto'

import React from 'react'

import { renderVoltraToString, Voltra } from '../server'

/**
 * Payload Budget Tests
 *
 * ActivityKit has a hard limit of 4KB for Live Activity payloads.
 * These tests ensure we throw a helpful error when the payload is too large.
 */

// Generate truly random base64 using crypto - incompressible
const generateRandomBase64 = (bytes: number): string => {
  return randomBytes(bytes).toString('base64')
}

describe('Payload budget validation', () => {
  it('throws when payload contains oversized base64 image', async () => {
    // 10KB of random bytes
    const oversizedBase64 = generateRandomBase64(10000)

    const variants = {
      lockScreen: (
        <Voltra.VStack>
          <Voltra.Image source={{ base64: oversizedBase64 }} />
          <Voltra.Text>This will exceed the budget</Voltra.Text>
        </Voltra.VStack>
      ),
    }

    await expect(renderVoltraToString(variants)).rejects.toThrow(/exceeds safe budget/)
  })

  it('accepts payloads within budget', async () => {
    const variants = {
      lockScreen: (
        <Voltra.VStack>
          <Voltra.Image source={{ assetName: 'small-icon' }} />
          <Voltra.Text>Normal sized payload</Voltra.Text>
        </Voltra.VStack>
      ),
    }

    await expect(renderVoltraToString(variants)).resolves.toBeDefined()
  })
})
