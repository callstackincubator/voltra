import type { WidgetRegistry } from './widgetRegistry'
import type { LiveActivityRegistry } from './liveActivityRegistry'

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
  entry: { generatedEntryRelativePath: string; platform: 'ios' | 'android' },
  originalSearchParams: URLSearchParams
): string {
  const query = new URLSearchParams(originalSearchParams)
  query.set('bundleEntry', entry.generatedEntryRelativePath)
  query.set('platform', entry.platform)

  return `/voltra-widget.bundle?${query.toString()}`
}

export function createVoltraMiddleware({
  registry,
  liveActivityRegistry,
  widgetMetro,
}: {
  registry: WidgetRegistry
  liveActivityRegistry?: LiveActivityRegistry
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

    if (pathname === '/' || pathname === '/widgets' || pathname === '/live-activities') {
      try {
        if (pathname === '/live-activities') {
          sendJson(res, 200, {
            ready: liveActivityRegistry?.isReady() ?? false,
            platform: 'ios',
            liveActivities: liveActivityRegistry?.listLiveActivities() ?? [],
          })
          return
        }
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

    const liveActivityBundleMatch = pathname.match(/^\/live-activities\/([^/]+)\.bundle$/)
    if (liveActivityBundleMatch) {
      const definitionId = decodeURIComponent(liveActivityBundleMatch[1])
      if (hasPlatformParam && requestedPlatform !== 'ios') {
        sendJson(res, 400, { error: 'Dynamic Live Activities are available only for platform "ios".' })
        return
      }
      if (!liveActivityRegistry) {
        sendJson(res, 404, { error: `Unknown Voltra Dynamic Live Activity "${definitionId}" for platform "ios".` })
        return
      }
      try {
        const liveActivity = liveActivityRegistry.getLiveActivity(definitionId)
        if (!liveActivity) {
          sendJson(res, 404, { error: `Unknown Voltra Dynamic Live Activity "${definitionId}" for platform "ios".` })
          return
        }
        req.url = createBundleRequest(liveActivity, requestUrl.searchParams)
        widgetMetro.middleware(req, res, next)
        return
      } catch (error) {
        sendJson(res, 500, { error: error instanceof Error ? error.message : String(error) })
        return
      }
    }

    sendJson(res, 404, {
      error: `Unknown Voltra endpoint "${pathname}".`,
    })
  }
}
