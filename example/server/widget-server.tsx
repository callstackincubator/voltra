/**
 * Example Widget Server
 *
 * This is a standalone Node.js server that serves widget content via HTTP/HTTPS.
 * The iOS widget extension (or Android WorkManager) periodically fetches
 * from this server to update the widget without the user opening the app.
 *
 */
import { createServer } from 'node:http'

import React from 'react'
import { createWidgetUpdateNodeHandler } from 'voltra/server'
import { IosPortfolioWidget } from '../widgets/ios/IosPortfolioWidget'
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

const handler = createWidgetUpdateNodeHandler({
  renderIos: async (req: any) => {
    const now = new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false })
    const { chartData, change, balance } = generatePortfolioData()
    const isPositive = change >= 0
    const changeText = `${isPositive ? '+' : ''}${change.toFixed(1)}%`

    console.log(`[${now}] [iOS] Rendering portfolio widget → ${changeText} (${balance})`)

    const content = <IosPortfolioWidget portfolio={{ chartData, change, balance, time: now }} />

    return {
      systemSmall: content,
      systemMedium: content,
      systemLarge: content,
    }
  },

  renderAndroid: async (req: any) => {
    const now = new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false })
    const { chartData, change, balance } = generatePortfolioData()
    const isPositive = change >= 0
    const changeText = `${isPositive ? '+' : ''}${change.toFixed(1)}%`

    console.log(`[${now}] [Android] Rendering portfolio widget → ${changeText} (${balance})`)

    const content = <AndroidPortfolioWidget portfolio={{ chartData, change, balance, time: now }} />

    return [
      { size: { width: 200, height: 200 }, content },
      { size: { width: 300, height: 200 }, content },
    ]
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
  console.log(`\n  (Android emulator uses 10.0.2.2 to reach the host machine)`)
  console.log(`\nEach request generates randomized portfolio data.`)
  console.log(`Press Ctrl+C to stop.\n`)
})
