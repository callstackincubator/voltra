// This is a server-side module, which is supposed to run in Node.js environment.
/// <reference types="node" />

import { promisify } from 'node:util'
import { brotliCompress, constants } from 'node:zlib'

import { renderLiveActivityToString as render } from './live-activity/renderer.js'
import type { LiveActivityVariants } from './live-activity/types.js'
import { ensurePayloadWithinBudget } from './payload.js'

export * as Voltra from './jsx/primitives.js'
export { renderWidgetToString } from './widgets/renderer.js'
export type { WidgetVariants } from './widgets/types.js'

// Widget Server Update Handler
export {
  createWidgetUpdateHandler,
  type WidgetPlatform,
  type WidgetRenderRequest,
  type WidgetUpdateHandlerOptions,
} from './widget-server.js'

const brotliCompressAsync = promisify(brotliCompress)

const compressPayload = async (jsonString: string): Promise<string> => {
  // Compress using Brotli - level 2
  // Technically, iOS supports decompression from any level, but we use level 2 for consistency.
  const jsonBuffer = Buffer.from(jsonString, 'utf8')

  const compressedBuffer = await brotliCompressAsync(jsonBuffer, {
    params: {
      [constants.BROTLI_PARAM_QUALITY]: 2,
      [constants.BROTLI_PARAM_SIZE_HINT]: jsonBuffer.length,
    },
  })

  // Return base64-encoded compressed string
  return compressedBuffer.toString('base64')
}

export const renderLiveActivityToString = async (variants: LiveActivityVariants): Promise<string> => {
  const jsonString = render(variants)
  const compressedBase64 = await compressPayload(jsonString)
  ensurePayloadWithinBudget(compressedBase64)

  return compressedBase64
}
