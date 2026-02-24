import type { WidgetVariants } from 'voltra'

import { IosDynamicWeatherWidget } from './IosDynamicWeatherWidget'

const initialState: WidgetVariants = {
  systemSmall: <IosDynamicWeatherWidget />,
  systemMedium: <IosDynamicWeatherWidget />,
  systemLarge: <IosDynamicWeatherWidget />,
}

export default initialState
