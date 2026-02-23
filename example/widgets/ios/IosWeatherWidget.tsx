import { Voltra } from 'voltra'

import {
  DEFAULT_WEATHER,
  WEATHER_DESCRIPTIONS,
  WEATHER_EMOJIS,
  WEATHER_GRADIENTS,
  type WeatherData,
} from '../weather-types'

const formatTime = (date: Date) => {
  return date.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  })
}

interface WeatherWidgetProps {
  weather?: WeatherData
}

export const IosWeatherWidget = ({ weather = DEFAULT_WEATHER }: WeatherWidgetProps) => {
  const gradient = WEATHER_GRADIENTS[weather.condition]
  const emoji = WEATHER_EMOJIS[weather.condition]
  const description = WEATHER_DESCRIPTIONS[weather.condition]

  return (
    <Voltra.LinearGradient colors={gradient.colors} start={gradient.start} end={gradient.end} style={{ flex: 1 }}>
      <Voltra.VStack style={{ flex: 1, padding: 16 }}>
        {/* Temperature and Icon */}
        <Voltra.HStack alignment="center" spacing={8}>
          <Voltra.Text
            style={{
              fontSize: 42,
              fontWeight: '300',
              color: '#FFFFFF',
              shadowColor: '#000000',
              shadowOpacity: 0.3,
              shadowRadius: 2,
              shadowOffset: { width: 0, height: 2 },
            }}
          >
            {weather.temperature}°
          </Voltra.Text>

          <Voltra.Spacer />

          <Voltra.Text
            style={{
              fontSize: 32,
              shadowColor: '#000000',
              shadowOpacity: 0.3,
              shadowRadius: 2,
              shadowOffset: { width: 0, height: 2 },
            }}
          >
            {emoji}
          </Voltra.Text>
        </Voltra.HStack>

        {/* Description */}
        <Voltra.Text
          style={{
            fontSize: 16,
            fontWeight: '500',
            color: '#FFFFFF',
            opacity: 0.9,
            shadowColor: '#000000',
            shadowOpacity: 0.3,
            shadowRadius: 1,
            shadowOffset: { width: 0, height: 1 },
            marginTop: 4,
          }}
        >
          {description}
        </Voltra.Text>

        {/* Location */}
        {weather.location ? (
          <Voltra.Text
            style={{
              fontSize: 14,
              color: '#FFFFFF',
              opacity: 0.8,
              shadowColor: '#000000',
              shadowOpacity: 0.3,
              shadowRadius: 1,
              shadowOffset: { width: 0, height: 1 },
              marginTop: 8,
            }}
          >
            📍 {weather.location}
          </Voltra.Text>
        ) : null}

        {/* High/Low Temps */}
        {weather.highTemp !== undefined && weather.lowTemp !== undefined ? (
          <Voltra.HStack spacing={12} style={{ marginTop: 12 }}>
            <Voltra.HStack alignment="center" spacing={4}>
              <Voltra.Text style={{ fontSize: 12, color: '#FFFFFF', opacity: 0.8 }}>🔥</Voltra.Text>
              <Voltra.Text
                style={{
                  fontSize: 14,
                  fontWeight: '500',
                  color: '#FFFFFF',
                  shadowColor: '#000000',
                  shadowOpacity: 0.3,
                  shadowRadius: 1,
                  shadowOffset: { width: 0, height: 1 },
                }}
              >
                {weather.highTemp}°
              </Voltra.Text>
            </Voltra.HStack>
            <Voltra.HStack alignment="center" spacing={4}>
              <Voltra.Text style={{ fontSize: 12, color: '#FFFFFF', opacity: 0.8 }}>❄️</Voltra.Text>
              <Voltra.Text
                style={{
                  fontSize: 14,
                  fontWeight: '500',
                  color: '#FFFFFF',
                  shadowColor: '#000000',
                  shadowOpacity: 0.3,
                  shadowRadius: 1,
                  shadowOffset: { width: 0, height: 1 },
                }}
              >
                {weather.lowTemp}°
              </Voltra.Text>
            </Voltra.HStack>
          </Voltra.HStack>
        ) : null}

        {/* Last Updated */}
        {weather.lastUpdated ? (
          <Voltra.Text
            style={{
              fontSize: 10,
              color: '#FFFFFF',
              opacity: 0.6,
              marginTop: 8,
            }}
          >
            🕒 {formatTime(weather.lastUpdated)}
          </Voltra.Text>
        ) : null}
      </Voltra.VStack>
    </Voltra.LinearGradient>
  )
}
