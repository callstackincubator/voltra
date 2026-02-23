import type { WidgetVariants } from 'voltra'

import { IosWeatherWidget } from './IosWeatherWidget'

const initialState: WidgetVariants = {
  systemSmall: <IosWeatherWidget />,
  systemMedium: <IosWeatherWidget />,
  systemLarge: <IosWeatherWidget />,
}

export default initialState
