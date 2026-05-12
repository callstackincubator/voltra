import type { WidgetVariants } from '@use-voltra/ios'

import { IosWeatherWidget } from './IosWeatherWidget'

const initialState: WidgetVariants = {
  systemSmall: <IosWeatherWidget />,
  systemMedium: <IosWeatherWidget />,
  systemLarge: <IosWeatherWidget />,
}

export default initialState
