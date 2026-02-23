import { VoltraAndroid } from 'voltra/android'

import { DEFAULT_WEATHER, WEATHER_EMOJIS, WEATHER_GRADIENTS, type WeatherData } from '../weather-types'

interface AndroidWeatherWidgetProps {
  weather?: WeatherData
}

export const AndroidDynamicWeatherWidget = ({ weather = DEFAULT_WEATHER }: AndroidWeatherWidgetProps) => {
  const gradient = WEATHER_GRADIENTS[weather.condition]
  const emoji = WEATHER_EMOJIS[weather.condition]

  return (
    <VoltraAndroid.Box
      style={{
        width: '100%',
        height: '100%',
        backgroundColor: gradient.colors[0],
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
            {weather.temperature}°
          </VoltraAndroid.Text>
          <VoltraAndroid.Text style={{ fontSize: 32 }}>{emoji}</VoltraAndroid.Text>
        </VoltraAndroid.Row>

        <VoltraAndroid.Text style={{ fontSize: 16, fontWeight: '500', color: '#FFFFFF' }}>
          {weather.condition.charAt(0).toUpperCase() + weather.condition.slice(1)}
        </VoltraAndroid.Text>

        <VoltraAndroid.Spacer style={{ height: 8 }} />
        <VoltraAndroid.Text style={{ fontSize: 10, color: '#FFFFFF' }}>
          Server-driven - Initial state
        </VoltraAndroid.Text>
      </VoltraAndroid.Column>
    </VoltraAndroid.Box>
  )
}
