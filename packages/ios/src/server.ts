/// <reference types="node" />

import { promisify } from 'node:util'
import { brotliCompress, constants } from 'node:zlib'

import { renderLiveActivityToString as render } from './live-activity/renderer.js'
import type { LiveActivityVariants } from './live-activity/types.js'
import { ensurePayloadWithinBudget } from './payload.js'
import * as Voltra from './jsx/primitives.js'

export { Voltra }
export { renderWidgetToString } from './widgets/renderer.js'
export type { WidgetVariants } from './widgets/types.js'

const brotliCompressAsync = promisify(brotliCompress)

const compressPayload = async (jsonString: string): Promise<string> => {
  const jsonBuffer = Buffer.from(jsonString, 'utf8')

  // Quality 11 is brotli's maximum. It costs a few milliseconds of CPU per payload on the
  // server and yields 10-27% smaller Live Activity payloads than quality 2. Quality is an
  // encoder-only setting, so the Swift decoder needs no change. Do not enable
  // BROTLI_PARAM_LARGE_WINDOW: it changes the stream format and standard decoders reject it.
  const compressedBuffer = await brotliCompressAsync(jsonBuffer, {
    params: {
      [constants.BROTLI_PARAM_QUALITY]: 11,
      [constants.BROTLI_PARAM_SIZE_HINT]: jsonBuffer.length,
    },
  })

  return compressedBuffer.toString('base64')
}

export const renderLiveActivityToString = async (variants: LiveActivityVariants): Promise<string> => {
  const jsonString = render(variants)
  const compressedBase64 = await compressPayload(jsonString)
  ensurePayloadWithinBudget(compressedBase64)

  return compressedBase64
}
