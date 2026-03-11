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
 * Read from the `platform` query parameter.
 */
export type WidgetPlatform = 'ios' | 'android'

/**
 * The system color scheme reported by the native widget.
 * Read from the `theme` query parameter.
 */
export type WidgetTheme = 'light' | 'dark'

function isWidgetPlatform(value: string | null): value is WidgetPlatform {
  return value === 'ios' || value === 'android'
}

function isWidgetTheme(value: string | null): value is WidgetTheme {
  return value === 'light' || value === 'dark'
}

type NodeLikeRequest = IncomingMessage & {
  url?: string
  method?: string
  headers: Record<string, string | string[] | undefined>
  socket?: {
    encrypted?: boolean
  }
}

type NodeLikeResponse = ServerResponse

export type WidgetUpdateHandler = (request: Request) => Promise<Response>
export type WidgetUpdateNodeHandler = (req: NodeLikeRequest, res: NodeLikeResponse) => Promise<void>
export type WidgetUpdateExpressHandler = WidgetUpdateNodeHandler

/**
 * Request context provided to the widget render handler.
 * Contains the widget ID, family, and any auth headers from the request.
 */
export interface WidgetRenderRequest {
  /** The widget ID requesting an update */
  widgetId: string
  /** The platform the request is coming from */
  platform: WidgetPlatform
  /** The system color scheme (`light` or `dark`). Defaults to `light` when not provided. */
  theme: WidgetTheme
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
  renderIos: (request: WidgetRenderRequest) => Promise<WidgetVariants | null> | WidgetVariants | null

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

function jsonResponse(status: number, body: Record<string, string>): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'Content-Type': 'application/json',
    },
  })
}

function normalizeHeaders(headers: Headers): Record<string, string> {
  const result: Record<string, string> = {}

  headers.forEach((value, key) => {
    result[key] = value
  })

  return result
}

function getNodeRequestUrl(req: NodeLikeRequest): string {
  const protocol = req.socket?.encrypted ? 'https' : 'http'
  const host = req.headers.host || 'localhost'
  return new URL(req.url || '/', `${protocol}://${host}`).toString()
}

function createFetchRequestFromNode(req: NodeLikeRequest): Request {
  const headers = new Headers()

  for (const [key, value] of Object.entries(req.headers)) {
    if (Array.isArray(value)) {
      for (const item of value) {
        headers.append(key, item)
      }
      continue
    }

    if (typeof value === 'string') {
      headers.set(key, value)
    }
  }

  return new Request(getNodeRequestUrl(req), {
    method: req.method || 'GET',
    headers,
  })
}

async function writeFetchResponseToNode(response: Response, res: NodeLikeResponse): Promise<void> {
  const headers: Record<string, string> = {}

  response.headers.forEach((value, key) => {
    headers[key] = value
  })

  res.writeHead(response.status, headers)
  res.end(await response.text())
}

/**
 * Creates a Fetch API request handler for serving widget updates.
 *
 * This handler can be used with Bun, Deno, Hono, Expo API routes, or any
 * compatible runtime. It:
 * 1. Extracts widgetId, platform, and family from query parameters
 * 2. Validates the auth token (if validateToken is provided)
 * 3. Calls your render function to generate widget content
 * 4. Returns the rendered JSON payload
 *
 */
export function createWidgetUpdateHandler(options: WidgetUpdateHandlerOptions): WidgetUpdateHandler {
  const { renderIos, renderAndroid, validateToken } = options

  return async (request: Request): Promise<Response> => {
    try {
      const url = new URL(request.url)
      const widgetId = url.searchParams.get('widgetId')
      const family = url.searchParams.get('family') || undefined
      const platformParam = url.searchParams.get('platform')

      if (!widgetId) {
        return jsonResponse(400, { error: 'Missing required query parameter: widgetId' })
      }

      if (!isWidgetPlatform(platformParam)) {
        return jsonResponse(400, { error: 'Missing or invalid required query parameter: platform' })
      }

      const platform: WidgetPlatform = platformParam
      const themeParam = url.searchParams.get('theme')
      const theme: WidgetTheme = isWidgetTheme(themeParam) ? themeParam : 'light'

      // Extract auth token
      const authHeader = request.headers.get('authorization')
      const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : undefined

      // Validate token if validator is provided
      if (validateToken) {
        if (!token) {
          return jsonResponse(401, { error: 'Authorization required' })
        }

        const isValid = await validateToken(token)
        if (!isValid) {
          return jsonResponse(401, { error: 'Invalid token' })
        }
      }

      // Build request context
      const renderRequest: WidgetRenderRequest = {
        widgetId,
        platform,
        theme,
        family,
        token,
        headers: normalizeHeaders(request.headers),
      }

      if (platform === 'android') {
        if (!renderAndroid) {
          return jsonResponse(404, { error: `No Android render handler configured for widget: ${widgetId}` })
        }

        const androidVariants = await renderAndroid(renderRequest)

        if (!androidVariants) {
          return jsonResponse(404, { error: `No content for Android widget: ${widgetId}` })
        }

        const { renderAndroidWidgetToString } = await import('./android/widgets/renderer.js')
        const jsonPayload = renderAndroidWidgetToString(androidVariants)

        return new Response(jsonPayload, {
          status: 200,
          headers: {
            'Content-Type': 'application/json',
            'Cache-Control': 'no-cache',
          },
        })
      } else {
        const variants = await renderIos(renderRequest)

        if (!variants) {
          return jsonResponse(404, { error: `No content for widget: ${widgetId}` })
        }

        const { renderWidgetToString } = await import('./widgets/renderer.js')
        const jsonPayload = renderWidgetToString(variants as WidgetVariants)

        return new Response(jsonPayload, {
          status: 200,
          headers: {
            'Content-Type': 'application/json',
            'Cache-Control': 'no-cache',
          },
        })
      }
    } catch (error) {
      console.error('[Voltra] Widget update handler error:', error)
      return jsonResponse(500, { error: 'Internal server error' })
    }
  }
}

/**
 * Creates a Node.js HTTP request handler for serving widget updates.
 *
 * This adapter delegates to the Fetch-native widget update handler and can be
 * used with `node:http` or frameworks built on top of Node request/response objects.
 */
export function createWidgetUpdateNodeHandler(options: WidgetUpdateHandlerOptions): WidgetUpdateNodeHandler {
  const handler = createWidgetUpdateHandler(options)

  return async (req: NodeLikeRequest, res: NodeLikeResponse): Promise<void> => {
    const request = createFetchRequestFromNode(req)
    const response = await handler(request)
    await writeFetchResponseToNode(response, res)
  }
}

/**
 * Creates an Express-compatible request handler for serving widget updates.
 *
 * This adapter currently reuses the Node.js handler because Express request and
 * response objects extend the underlying Node HTTP primitives.
 */
export function createWidgetUpdateExpressHandler(options: WidgetUpdateHandlerOptions): WidgetUpdateExpressHandler {
  return createWidgetUpdateNodeHandler(options)
}
