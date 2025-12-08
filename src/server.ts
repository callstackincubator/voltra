import { promisify } from 'node:util'
import { brotliCompress, constants } from 'node:zlib'

import { ensurePayloadWithinBudget } from './payload'
import { renderVoltraToString as render, type VoltraVariants } from './renderer'

export * as Voltra from './jsx/primitives'
export type { VoltraVariants } from './renderer'

const brotliCompressAsync = promisify(brotliCompress)

function compressPayload(jsonString: string): Promise<string> {
  // Compress using brotli level 2
  const jsonBuffer = Buffer.from(jsonString, 'utf8')
  return brotliCompressAsync(jsonBuffer, {
    params: {
      [constants.BROTLI_PARAM_QUALITY]: 2,
      [constants.BROTLI_PARAM_SIZE_HINT]: jsonBuffer.length,
    },
  }).then((compressedBuffer) => {
    // Return base64-encoded compressed string
    return compressedBuffer.toString('base64')
  })
}

export const renderVoltraToString = async (variants: VoltraVariants): Promise<string> => {
  const jsonString = render(variants)
  const compressedBase64 = await compressPayload(jsonString)
  ensurePayloadWithinBudget(compressedBase64)
  return compressedBase64
}
