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

export const IosWeatherDynamicWidget = ({ weather = DEFAULT_WEATHER }: WeatherWidgetProps) => {
  const gradient = WEATHER_GRADIENTS[weather.condition]
  const emoji = WEATHER_EMOJIS[weather.condition]

  return (
    <Voltra.LinearGradient colors={gradient.colors} start={gradient.start} end={gradient.end} style={{ flex: 1 }}>
      <Voltra.VStack style={{ flex: 1, padding: 16 }}>
        <Voltra.HStack alignment="center" spacing={8}>
          <Voltra.Text style={{ fontSize: 42, fontWeight: '300', color: '#FFFFFF' }}>
            {weather.temperature}°
          </Voltra.Text>
          <Voltra.Spacer />
          <Voltra.Text style={{ fontSize: 32 }}>{emoji}</Voltra.Text>
        </Voltra.HStack>
        <Voltra.Text style={{ fontSize: 16, fontWeight: '500', color: '#FFFFFF', opacity: 0.9, marginTop: 8 }}>
          {weather.condition}
        </Voltra.Text>
        <Voltra.Spacer />
        <Voltra.Divider style={{ backgroundColor: 'rgba(255,255,255,0.3)', height: 1 }} />

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
      </Voltra.VStack>
    </Voltra.LinearGradient>
  )
}
