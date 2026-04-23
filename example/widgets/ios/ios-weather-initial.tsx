import type { WidgetVariants } from 'voltra'

import { WeatherWidget } from './IosWeatherWidget'

const initialState: WidgetVariants = {
  systemSmall: <WeatherWidget />,
  systemMedium: <WeatherWidget />,
  systemLarge: <WeatherWidget />,
}

export default initialState
