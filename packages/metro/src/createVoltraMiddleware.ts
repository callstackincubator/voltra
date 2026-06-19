import type { WidgetRegistry } from './widgetRegistry'

type Middleware = (req: any, res: any, next: () => void) => void

function parsePlatform(value: string | null): 'ios' | 'android' | null {
  if (value === 'ios' || value === 'android') {
    return value
  }

  return null
}

function sendJson(res: any, status: number, value: unknown): void {
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
  })
  res.end(JSON.stringify(value, null, 2))
}

function createBundleRequest(
  widget: { generatedEntryRelativePath: string; platform: 'ios' | 'android' },
  originalSearchParams: URLSearchParams
): string {
  const query = new URLSearchParams(originalSearchParams)
  query.set('bundleEntry', widget.generatedEntryRelativePath)
  query.set('platform', widget.platform)

  return `/voltra-widget.bundle?${query.toString()}`
}

export function createVoltraMiddleware({
  registry,
  widgetMetro,
}: {
  registry: WidgetRegistry
  widgetMetro: { middleware: Middleware }
}): Middleware {
  return (req, res, next) => {
    const requestUrl = new URL(req.url, 'http://localhost')
    const pathname = requestUrl.pathname || '/'
    const requestedPlatform = parsePlatform(requestUrl.searchParams.get('platform'))
    const hasPlatformParam = requestUrl.searchParams.has('platform')

    if (hasPlatformParam && !requestedPlatform) {
      sendJson(res, 400, {
        error: 'Missing or invalid platform query parameter. Expected "ios" or "android".',
      })
      return
    }

    if (pathname === '/' || pathname === '/widgets') {
      try {
        sendJson(res, 200, {
          ready: registry.isReady(),
          platform: requestedPlatform,
          widgets: registry.listWidgets(requestedPlatform ?? undefined),
        })
      } catch (error) {
        sendJson(res, 500, {
          error: error instanceof Error ? error.message : String(error),
        })
      }
      return
    }

    const widgetBundleMatch = pathname.match(/^\/widgets\/([^/]+)\.bundle$/)
    if (widgetBundleMatch) {
      const widgetId = decodeURIComponent(widgetBundleMatch[1])
      if (!requestedPlatform) {
        sendJson(res, 400, {
          error: 'Missing or invalid platform query parameter. Expected "ios" or "android".',
        })
        return
      }

      try {
        const widget = registry.getWidget(requestedPlatform, widgetId)

        if (!widget) {
          sendJson(res, 404, {
            error: `Unknown Voltra widget "${widgetId}" for platform "${requestedPlatform}".`,
          })
          return
        }

        req.url = createBundleRequest(widget, requestUrl.searchParams)
        widgetMetro.middleware(req, res, next)
        return
      } catch (error) {
        sendJson(res, 500, {
          error: error instanceof Error ? error.message : String(error),
        })
      }
    }

    sendJson(res, 404, {
      error: `Unknown Voltra endpoint "${pathname}".`,
    })
  }
}
