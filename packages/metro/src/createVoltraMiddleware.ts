import type { WidgetRegistry } from './widgetRegistry'

type Middleware = (req: any, res: any, next: () => void) => void

function sendJson(res: any, status: number, value: unknown): void {
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
  })
  res.end(JSON.stringify(value, null, 2))
}

function createBundleRequest(
  widget: { generatedEntryRelativePath: string },
  originalSearchParams: URLSearchParams
): string {
  const query = new URLSearchParams(originalSearchParams)
  query.set('bundleEntry', widget.generatedEntryRelativePath)

  if (!query.has('platform')) {
    query.set('platform', 'voltra')
  }

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

    if (pathname === '/' || pathname === '/widgets') {
      sendJson(res, 200, {
        ready: registry.isReady(),
        widgets: registry.listWidgets(),
      })
      return
    }

    const widgetBundleMatch = pathname.match(/^\/widgets\/([^/]+)\.bundle$/)
    if (widgetBundleMatch) {
      const widgetId = decodeURIComponent(widgetBundleMatch[1])
      const widget = registry.getWidget(widgetId)

      if (!widget) {
        sendJson(res, registry.isReady() ? 404 : 425, {
          error: registry.isReady()
            ? `Unknown Voltra widget "${widgetId}".`
            : 'Voltra widget registry is not ready yet. Build the app bundle first.',
        })
        return
      }

      req.url = createBundleRequest(widget, requestUrl.searchParams)
      widgetMetro.middleware(req, res, next)
      return
    }

    sendJson(res, 404, {
      error: `Unknown Voltra endpoint "${pathname}".`,
    })
  }
}
