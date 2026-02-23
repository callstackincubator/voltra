import { AndroidDynamicWeatherWidget } from './AndroidDynamicWeatherWidget'

const initialState = [
  {
    size: { width: 200, height: 100 },
    content: <AndroidDynamicWeatherWidget />,
  },
  {
    size: { width: 200, height: 200 },
    content: <AndroidDynamicWeatherWidget />,
  },
  {
    size: { width: 300, height: 200 },
    content: <AndroidDynamicWeatherWidget />,
  },
]

export default initialState
