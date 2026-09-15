/**
 * Example Widget Server
 *
 * This is a standalone Node.js server that serves widget content via HTTP/HTTPS.
 * The iOS widget extension (or Android WorkManager) periodically fetches
 * from this server to update the widget without the user opening the app.
 *
 */
import { createServer } from 'node:http'

import { renderAndroidWidgetToString } from '@use-voltra/android-server'
import { renderWidgetToString } from '@use-voltra/ios-server'
import { createWidgetUpdateNodeHandler } from '@use-voltra/server'
import React from 'react'
import { IosPortfolioWidget } from '../widgets/ios/IosPortfolioWidget'
import { AndroidMaterialColorsServerWidget } from '../widgets/android/AndroidMaterialColorsWidget'
import { AndroidPortfolioWidget } from '../widgets/android/AndroidPortfolioWidget'

const PORTFOLIO_TIMES = [
  '09:00',
  '09:30',
  '10:00',
  '10:30',
  '11:00',
  '11:30',
  '12:00',
  '12:30',
  '13:00',
  '13:30',
  '14:00',
  '14:30',
  '15:00',
  '15:30',
  '16:00',
  '16:30',
]

function generatePortfolioData() {
  let value = 30 + Math.random() * 40
  const chartData = PORTFOLIO_TIMES.map((time) => {
    value = Math.max(5, Math.min(95, value + (Math.random() - 0.45) * 15))
    return { x: time, y: Math.round(value) }
  })
  const first = chartData[0]!.y
  const last = chartData[chartData.length - 1]!.y
  const change = Math.round(((last - first) / first) * 1000) / 10
  const balance = (10000 + Math.random() * 8000).toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',')
  return { chartData, change, balance: `$${balance}` }
}

// Deterministic per-city "temperature" so repeated requests for the same city are stable and
// distinguishable from other cities in a screenshot or log line.
function temperatureForCity(city: string): number {
  let hash = 0
  for (let i = 0; i < city.length; i++) {
    hash = (hash * 31 + city.charCodeAt(i)) | 0
  }
  return 5 + (Math.abs(hash) % 30)
}

// Widgets under test for ADR 0007 (per-instance server fetches): both have an `entry`, so the
// response body becomes the widget's props verbatim (see server-driven-widgets docs, "Returning
// data instead of UI"). We parse `configuration` and `instance` off the query and log both so the
// e2e suite can assert the server saw distinct requests per placement.
const INSTANCE_DEMO_WIDGET_IDS = new Set(['AndroidClientDemoWidget', 'ClientRenderedDemoWidget'])

function renderInstanceDemoProps(req: { widgetId: string; platform: string; url: URL }): string | null {
  if (!INSTANCE_DEMO_WIDGET_IDS.has(req.widgetId)) {
    return null
  }

  const instance = req.url.searchParams.get('instance')
  const configurationRaw = req.url.searchParams.get('configuration')

  let city = 'London'
  if (configurationRaw) {
    try {
      const parsed = JSON.parse(configurationRaw)
      if (typeof parsed?.city === 'string' && parsed.city.length > 0) {
        city = parsed.city
      }
    } catch {
      // Fall through to the default city on malformed configuration.
    }
  }

  const now = new Date().toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  })
  console.log(
    `[${now}] [${req.platform}] ${req.widgetId} instance=${instance ?? '(none)'} configuration=${
      configurationRaw ?? '(none)'
    } → city=${city}`
  )

  return JSON.stringify({
    city,
    temperature: temperatureForCity(city),
    instance: instance ?? undefined,
  })
}

const handler = createWidgetUpdateNodeHandler({
  renderIos: async (req: any) => {
    const instanceDemoProps = renderInstanceDemoProps(req)
    if (instanceDemoProps !== null) {
      return instanceDemoProps
    }

    if (req.widgetId !== 'portfolio') {
      return null
    }

    const now = new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false })
    const { chartData, change, balance } = generatePortfolioData()
    const isPositive = change >= 0
    const changeText = `${isPositive ? '+' : ''}${change.toFixed(1)}%`

    console.log(`[${now}] [iOS] Rendering portfolio widget → ${changeText} (${balance})`)

    const content = <IosPortfolioWidget portfolio={{ chartData, change, balance, time: now }} />
    const variants = {
      systemSmall: content,
      systemMedium: content,
      systemLarge: content,
    }

    return renderWidgetToString(variants)
  },

  renderAndroid: async (req: any) => {
    const instanceDemoProps = renderInstanceDemoProps(req)
    if (instanceDemoProps !== null) {
      return instanceDemoProps
    }

    const now = new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false })

    if (req.widgetId === 'material_colors') {
      console.log(`[${now}] [Android] Rendering material colors widget`)

      const content = <AndroidMaterialColorsServerWidget renderedAt={now} />
      const variants = [
        { size: { width: 200, height: 200 }, content },
        { size: { width: 300, height: 200 }, content },
      ]

      return renderAndroidWidgetToString(variants)
    }

    if (req.widgetId !== 'portfolio') {
      return null
    }

    const { chartData, change, balance } = generatePortfolioData()
    const isPositive = change >= 0
    const changeText = `${isPositive ? '+' : ''}${change.toFixed(1)}%`

    console.log(`[${now}] [Android] Rendering portfolio widget → ${changeText} (${balance})`)

    const content = <AndroidPortfolioWidget portfolio={{ chartData, change, balance, time: now }} />
    const variants = [
      { size: { width: 200, height: 200 }, content },
      { size: { width: 300, height: 200 }, content },
    ]

    return renderAndroidWidgetToString(variants)
  },
  validateToken: (token: string) => {
    const validToken = token === 'demo-token'
    return validToken
  },
})

const PORT = 3333

createServer(handler).listen(PORT, () => {
  console.log(`\n🚀 Voltra Widget Server running at http://localhost:${PORT}`)
  console.log(`\n  Portfolio chart:`)
  console.log(`  iOS:     GET http://localhost:${PORT}?widgetId=portfolio&platform=ios&family=systemSmall`)
  console.log(`  Android: GET http://10.0.2.2:${PORT}?widgetId=portfolio&platform=android`)
  console.log(`\n  Material colors:`)
  console.log(`  Android: GET http://10.0.2.2:${PORT}?widgetId=material_colors&platform=android`)
  console.log(`\n  (Android emulator uses 10.0.2.2 to reach the host machine)`)
  console.log(`\nEach request generates randomized portfolio data.`)
  console.log(`Press Ctrl+C to stop.\n`)
})
