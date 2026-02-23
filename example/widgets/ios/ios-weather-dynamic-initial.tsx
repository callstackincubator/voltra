import type { WidgetVariants } from 'voltra'

import { IosWeatherDynamicWidget } from './IosWeatherDynamicWidget'

const initialState: WidgetVariants = {
  systemSmall: <IosWeatherDynamicWidget />,
  systemMedium: <IosWeatherDynamicWidget />,
  systemLarge: <IosWeatherDynamicWidget />,
}

export default initialState
