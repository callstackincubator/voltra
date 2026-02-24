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
import { VoltraAndroid } from 'voltra/android'
import { createWidgetUpdateHandler, Voltra } from 'voltra/server'

const WEATHER_CONDITIONS = [
  { condition: 'Sunny', emoji: '☀️', temp: 72, colors: ['#FFD700', '#FFA500'] as const },
  { condition: 'Cloudy', emoji: '☁️', temp: 58, colors: ['#778899', '#B0C4DE'] as const },
  { condition: 'Rainy', emoji: '🌧️', temp: 51, colors: ['#4682B4', '#5F9EA0'] as const },
  { condition: 'Stormy', emoji: '⛈️', temp: 45, colors: ['#2F4F4F', '#696969'] as const },
  { condition: 'Snowy', emoji: '❄️', temp: 28, colors: ['#F0F8FF', '#E6E6FA'] as const },
  { condition: 'Hot', emoji: '🔥', temp: 95, colors: ['#FF4500', '#FF6347'] as const },
] as const

let currentIndex = 0

function getWeather() {
  const weather = WEATHER_CONDITIONS[currentIndex % WEATHER_CONDITIONS.length]!
  currentIndex++
  return weather
}

const handler = createWidgetUpdateHandler({
  renderIos: async (req: any) => {
    const weather = getWeather()
    const now = new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false })

    console.log(
      `[${now}] [iOS] Rendering widget "${req.widgetId}" (family: ${req.family ?? 'all'}) → ${weather.emoji} ${
        weather.condition
      } ${weather.temp}°`
    )

    const content = (
      <Voltra.LinearGradient colors={[...weather.colors]} start="top" end="bottom" style={{ flex: 1 }}>
        <Voltra.VStack alignment="leading" style={{ flex: 1, padding: 16 }}>
          <Voltra.HStack alignment="center" spacing={8}>
            <Voltra.Text style={{ fontSize: 42, fontWeight: '300', color: '#FFFFFF' }}>{weather.temp}°</Voltra.Text>
            <Voltra.Spacer />
            <Voltra.Text style={{ fontSize: 32 }}>{weather.emoji}</Voltra.Text>
          </Voltra.HStack>
          <Voltra.Text style={{ fontSize: 16, fontWeight: '500', color: '#FFFFFF', opacity: 0.9, marginTop: 8 }}>
            {weather.condition}
          </Voltra.Text>
          <Voltra.Text
            style={{
              fontSize: 10,
              color: '#FFFFFF',
              opacity: 0.6,
              marginTop: 8,
            }}
          >
            🔄 Updated at {now}
          </Voltra.Text>
          <Voltra.Spacer />
        </Voltra.VStack>
      </Voltra.LinearGradient>
    )

    return {
      systemSmall: content,
      systemMedium: content,
      systemLarge: content,
    }
  },

  renderAndroid: async (req: any) => {
    const weather = getWeather()
    const now = new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false })

    console.log(
      `[${now}] [Android] Rendering widget "${req.widgetId}" → ${weather.emoji} ${weather.condition} ${weather.temp}°F`
    )

    const content = (
      <VoltraAndroid.Box
        style={{
          width: '100%',
          height: '100%',
          backgroundColor: weather.colors[0],
          padding: 16,
        }}
      >
        <VoltraAndroid.Column style={{ width: '100%', height: '100%' }} verticalAlignment="top">
          <VoltraAndroid.Row
            style={{ width: '100%' }}
            horizontalAlignment="space-between"
            verticalAlignment="center-vertically"
          >
            <VoltraAndroid.Text style={{ fontSize: 42, fontWeight: '300', color: '#FFFFFF' }}>
              {weather.temp}°
            </VoltraAndroid.Text>
            <VoltraAndroid.Text style={{ fontSize: 32 }}>{weather.emoji}</VoltraAndroid.Text>
          </VoltraAndroid.Row>
          <VoltraAndroid.Text style={{ fontSize: 16, fontWeight: '500', color: '#FFFFFF' }}>
            {weather.condition}
          </VoltraAndroid.Text>
          <VoltraAndroid.Spacer style={{ height: 8 }} />
          <VoltraAndroid.Text style={{ fontSize: 10, color: '#FFFFFF' }}>🔄 Updated at {now}</VoltraAndroid.Text>
        </VoltraAndroid.Column>
      </VoltraAndroid.Box>
    )

    return [
      { size: { width: 200, height: 100 }, content },
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
  console.log(`\nThe widget will fetch from:`)
  console.log(`  iOS:     GET http://localhost:${PORT}?widgetId=dynamic_weather&family=systemSmall`)
  console.log(`  Android: GET http://10.0.2.2:${PORT}?widgetId=dynamic_weather`)
  console.log(`\n  (Android emulator uses 10.0.2.2 to reach the host machine)`)
  console.log(`\nEach request cycles through different weather conditions.`)
  console.log(`Press Ctrl+C to stop.\n`)
})
