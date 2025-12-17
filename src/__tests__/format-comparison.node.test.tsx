import { encode } from '@msgpack/msgpack'
import { brotliCompressSync, constants } from 'node:zlib'
import React from 'react'

import { BasicLiveActivityUI } from '../../example/components/live-activities/BasicLiveActivityUI'
import { renderVoltraToJson } from '../renderer'

/**
 * Debug test to compare JSON vs MessagePack sizes at each stage
 */
describe('Format comparison (JSON vs MessagePack)', () => {
  it('should compare sizes at each stage', () => {
    const payload = renderVoltraToJson({
      lockScreen: <BasicLiveActivityUI />,
    })

    // Stage 1: Raw serialized data
    const jsonString = JSON.stringify(payload)
    const jsonBytes = Buffer.from(jsonString, 'utf8')
    const msgpackBytes = Buffer.from(encode(payload))

    console.log('\n=== Stage 1: Raw Serialized Data ===')
    console.log(`JSON:        ${jsonBytes.length} bytes`)
    console.log(`MessagePack: ${msgpackBytes.length} bytes`)
    console.log(
      `Difference:  ${msgpackBytes.length - jsonBytes.length} bytes (${((msgpackBytes.length / jsonBytes.length - 1) * 100).toFixed(1)}%)`
    )

    // Stage 2: After Brotli compression
    const brotliOptions = {
      params: {
        [constants.BROTLI_PARAM_QUALITY]: 2,
      },
    }
    const jsonCompressed = brotliCompressSync(jsonBytes, brotliOptions)
    const msgpackCompressed = brotliCompressSync(msgpackBytes, brotliOptions)

    console.log('\n=== Stage 2: After Brotli Compression ===')
    console.log(`JSON:        ${jsonCompressed.length} bytes`)
    console.log(`MessagePack: ${msgpackCompressed.length} bytes`)
    console.log(
      `Difference:  ${msgpackCompressed.length - jsonCompressed.length} bytes (${((msgpackCompressed.length / jsonCompressed.length - 1) * 100).toFixed(1)}%)`
    )

    // Stage 3: After Base64 encoding
    const jsonBase64 = jsonCompressed.toString('base64')
    const msgpackBase64 = msgpackCompressed.toString('base64')

    console.log('\n=== Stage 3: After Base64 Encoding ===')
    console.log(`JSON:        ${jsonBase64.length} chars`)
    console.log(`MessagePack: ${msgpackBase64.length} chars`)
    console.log(
      `Difference:  ${msgpackBase64.length - jsonBase64.length} chars (${((msgpackBase64.length / jsonBase64.length - 1) * 100).toFixed(1)}%)`
    )

    // Show the raw data for inspection
    console.log('\n=== Raw JSON ===')
    console.log(jsonString)

    console.log('\n=== MessagePack hex (first 100 bytes) ===')
    console.log(msgpackBytes.slice(0, 100).toString('hex'))
  })
})
