import { Voltra } from 'voltra'

import {
  DEFAULT_WEATHER,
  WEATHER_DESCRIPTIONS,
  WEATHER_EMOJIS,
  WEATHER_GRADIENTS,
  type WeatherData,
} from '../weather-types'

interface WeatherWidgetProps {
  weather?: WeatherData
}

export const IosDynamicWeatherWidget = ({ weather = DEFAULT_WEATHER }: WeatherWidgetProps) => {
  const gradient = WEATHER_GRADIENTS[weather.condition]
  const emoji = WEATHER_EMOJIS[weather.condition]
  const condition = WEATHER_DESCRIPTIONS[weather.condition]

  return (
    <Voltra.LinearGradient colors={gradient.colors} start={gradient.start} end={gradient.end} style={{ flex: 1 }}>
      <Voltra.VStack alignment="leading" style={{ flex: 1, padding: 16 }}>
        <Voltra.HStack alignment="center" spacing={8}>
          <Voltra.Text style={{ fontSize: 42, fontWeight: '300', color: '#FFFFFF' }}>
            {weather.temperature}°
          </Voltra.Text>
          <Voltra.Text style={{ fontSize: 32 }}>{emoji}</Voltra.Text>
        </Voltra.HStack>
        <Voltra.Text style={{ fontSize: 16, fontWeight: '500', color: '#FFFFFF', opacity: 0.9, marginTop: 8 }}>
          {condition}
        </Voltra.Text>

        <Voltra.Text
          style={{
            fontSize: 10,
            color: '#FFFFFF',
            opacity: 0.6,
            marginTop: 8,
          }}
        >
          Server-driven - Initial state
        </Voltra.Text>
        <Voltra.Spacer />
      </Voltra.VStack>
    </Voltra.LinearGradient>
  )
}
