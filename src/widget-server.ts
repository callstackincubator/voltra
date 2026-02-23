// This is a server-side module for handling widget update requests from native widgets.
/// <reference types="node" />

import type { IncomingMessage, ServerResponse } from 'node:http'

import type { AndroidWidgetVariants } from './android/widgets/types.js'
import type { WidgetVariants } from './widgets/types.js'

export { renderAndroidWidgetToString } from './android/widgets/renderer.js'
export type { AndroidWidgetVariants } from './android/widgets/types.js'
export { renderWidgetToString } from './widgets/renderer.js'
export type { WidgetVariants } from './widgets/types.js'

/**
 * The platform that sent the widget update request.
 * Detected automatically from the request query parameters.
 */
export type WidgetPlatform = 'ios' | 'android'

/**
 * Request context provided to the widget render handler.
 * Contains the widget ID, family, and any auth headers from the request.
 */
export interface WidgetRenderRequest {
  /** The widget ID requesting an update */
  widgetId: string
  /** The platform the request is coming from (detected automatically) */
  platform: WidgetPlatform
  /** The widget family/size (iOS only: "systemSmall", "systemMedium", etc.) */
  family?: string
  /** The authorization token from the request (if present) */
  token?: string
  /** All request headers */
  headers: Record<string, string | string[] | undefined>
}

/**
 * Options for creating the widget update handler.
 */
export interface WidgetUpdateHandlerOptions {
  /**
   * Render function that returns iOS widget variants for a given request.
   * Maps widget families (systemSmall, systemMedium, etc.) to JSX content.
   *
   * @param request - The widget render request context
   * @returns Widget variants to render, or null to return 404
   */
  render: (request: WidgetRenderRequest) => Promise<WidgetVariants | null> | WidgetVariants | null

  /**
   * Render function that returns Android widget variants for a given request.
   * Maps size breakpoints to JSX content.
   *
   * If not provided, Android requests will receive a 404 response.
   *
   * @param request - The widget render request context
   * @returns Android widget variants to render, or null to return 404
   */
  renderAndroid?: (request: WidgetRenderRequest) => Promise<AndroidWidgetVariants | null> | AndroidWidgetVariants | null

  /**
   * Optional validation function for auth tokens.
   * Return true if the token is valid, false to reject with 401.
   * If not provided, all requests are accepted.
   */
  validateToken?: (token: string) => Promise<boolean> | boolean
}

/**
 * Creates an HTTP request handler for serving widget updates.
 *
 * This handler can be used with Node.js HTTP server, Express, or any
 * compatible framework. It:
 * 1. Extracts widgetId and family from query parameters
 * 2. Validates the auth token (if validateToken is provided)
 * 3. Calls your render function to generate widget content
 * 4. Returns the rendered JSON payload
 *
 * @example With Node.js HTTP server
 * ```typescript
 * import { createServer } from 'node:http'
 * import { createWidgetUpdateHandler, Voltra } from 'voltra/server'
 *
 * const handler = createWidgetUpdateHandler({
 *   render: async (req) => {
 *     const data = await fetchWeatherData(req.token)
 *     return {
 *       systemSmall: <Voltra.Text>{data.temp}°F</Voltra.Text>,
 *       systemMedium: (
 *         <Voltra.HStack>
 *           <Voltra.Text>{data.temp}°F</Voltra.Text>
 *           <Voltra.Text>{data.condition}</Voltra.Text>
 *         </Voltra.HStack>
 *       ),
 *     }
 *   },
 *   validateToken: async (token) => {
 *     return await verifyJWT(token)
 *   },
 * })
 *
 * createServer(handler).listen(3000)
 * ```
 *
 * @example With Express
 * ```typescript
 * import express from 'express'
 * import { createWidgetUpdateHandler, Voltra } from 'voltra/server'
 *
 * const app = express()
 * app.get('/widgets/render', createWidgetUpdateHandler({
 *   render: async (req) => ({
 *     systemSmall: <Voltra.Text>Hello Widget!</Voltra.Text>,
 *   }),
 * }))
 * ```
 */
export function createWidgetUpdateHandler(
  options: WidgetUpdateHandlerOptions
): (req: IncomingMessage, res: ServerResponse) => Promise<void> {
  const { render, renderAndroid, validateToken } = options

  return async (req: IncomingMessage, res: ServerResponse): Promise<void> => {
    try {
      // Parse URL and query parameters
      const url = new URL(req.url || '/', `http://${req.headers.host || 'localhost'}`)
      const widgetId = url.searchParams.get('widgetId')
      const family = url.searchParams.get('family') || undefined

      // Detect platform: iOS sends `family` query param, Android does not
      const platform: WidgetPlatform = family ? 'ios' : 'android'

      if (!widgetId) {
        res.writeHead(400, { 'Content-Type': 'application/json' })
        res.end(JSON.stringify({ error: 'Missing required query parameter: widgetId' }))
        return
      }

      // Extract auth token
      const authHeader = req.headers.authorization
      const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : undefined

      // Validate token if validator is provided
      if (validateToken) {
        if (!token) {
          res.writeHead(401, { 'Content-Type': 'application/json' })
          res.end(JSON.stringify({ error: 'Authorization required' }))
          return
        }

        const isValid = await validateToken(token)
        if (!isValid) {
          res.writeHead(401, { 'Content-Type': 'application/json' })
          res.end(JSON.stringify({ error: 'Invalid token' }))
          return
        }
      }

      // Build request context
      const request: WidgetRenderRequest = {
        widgetId,
        platform,
        family,
        token,
        headers: req.headers as Record<string, string | string[] | undefined>,
      }

      if (platform === 'android') {
        // Android path: use renderAndroid callback and Android renderer
        if (!renderAndroid) {
          res.writeHead(404, { 'Content-Type': 'application/json' })
          res.end(JSON.stringify({ error: `No Android render handler configured for widget: ${widgetId}` }))
          return
        }

        const androidVariants = await renderAndroid(request)

        if (!androidVariants) {
          res.writeHead(404, { 'Content-Type': 'application/json' })
          res.end(JSON.stringify({ error: `No content for Android widget: ${widgetId}` }))
          return
        }

        const { renderAndroidWidgetToString } = await import('./android/widgets/renderer.js')
        const jsonPayload = renderAndroidWidgetToString(androidVariants)

        res.writeHead(200, {
          'Content-Type': 'application/json',
          'Cache-Control': 'no-cache',
        })
        res.end(jsonPayload)
      } else {
        // iOS path: use render callback and iOS renderer
        const variants = await render(request)

        if (!variants) {
          res.writeHead(404, { 'Content-Type': 'application/json' })
          res.end(JSON.stringify({ error: `No content for widget: ${widgetId}` }))
          return
        }

        const { renderWidgetToString } = await import('./widgets/renderer.js')
        const jsonPayload = renderWidgetToString(variants as WidgetVariants)

        res.writeHead(200, {
          'Content-Type': 'application/json',
          'Cache-Control': 'no-cache',
        })
        res.end(jsonPayload)
      }
    } catch (error) {
      console.error('[Voltra] Widget update handler error:', error)
      res.writeHead(500, { 'Content-Type': 'application/json' })
      res.end(JSON.stringify({ error: 'Internal server error' }))
    }
  }
}
