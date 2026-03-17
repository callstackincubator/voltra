/// <reference types="node" />

import type { IncomingMessage, ServerResponse } from 'node:http'

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
export type WidgetRenderResult = Promise<string | null> | string | null
export type WidgetRenderer = (request: WidgetRenderRequest) => WidgetRenderResult

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
   * Render function that returns a serialized iOS widget payload for a given request.
   * If not provided, iOS requests will receive a 404 response.
   */
  renderIos?: WidgetRenderer

  /**
   * Render function that returns a serialized Android widget payload for a given request.
   * If not provided, Android requests will receive a 404 response.
   */
  renderAndroid?: WidgetRenderer

  /**
   * Optional validation function for auth tokens.
   * Return true if the token is valid, false to reject with 401.
   * If not provided, all requests are accepted.
   */
  validateToken?: (token: string) => Promise<boolean> | boolean
}

function isWidgetPlatform(value: string | null): value is WidgetPlatform {
  return value === 'ios' || value === 'android'
}

function isWidgetTheme(value: string | null): value is WidgetTheme {
  return value === 'light' || value === 'dark'
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

      const authHeader = request.headers.get('authorization')
      const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : undefined

      if (validateToken) {
        if (!token) {
          return jsonResponse(401, { error: 'Authorization required' })
        }

        const isValid = await validateToken(token)
        if (!isValid) {
          return jsonResponse(401, { error: 'Invalid token' })
        }
      }

      const renderRequest: WidgetRenderRequest = {
        widgetId,
        platform,
        theme,
        family,
        token,
        headers: normalizeHeaders(request.headers),
      }

      const renderer = platform === 'android' ? renderAndroid : renderIos
      if (!renderer) {
        const platformName = platform === 'android' ? 'Android' : 'iOS'
        return jsonResponse(404, { error: `No ${platformName} render handler configured for widget: ${widgetId}` })
      }

      const jsonPayload = await renderer(renderRequest)
      if (!jsonPayload) {
        const errorMessage =
          platform === 'android' ? `No content for Android widget: ${widgetId}` : `No content for widget: ${widgetId}`

        return jsonResponse(404, { error: errorMessage })
      }

      return new Response(jsonPayload, {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'no-cache',
        },
      })
    } catch (error) {
      console.error('[Voltra] Widget update handler error:', error)
      return jsonResponse(500, { error: 'Internal server error' })
    }
  }
}

/**
 * Creates a Node.js HTTP request handler for serving widget updates.
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
 */
export function createWidgetUpdateExpressHandler(options: WidgetUpdateHandlerOptions): WidgetUpdateExpressHandler {
  return createWidgetUpdateNodeHandler(options)
}
