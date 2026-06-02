import { AndroidReactiveWeatherWidget } from './AndroidReactiveWeatherWidget'

const initialState = [
  {
    size: { width: 200, height: 200 },
    content: <AndroidReactiveWeatherWidget />,
  },
  {
    size: { width: 300, height: 200 },
    content: <AndroidReactiveWeatherWidget />,
  },
]

export default initialState
