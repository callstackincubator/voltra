// Mounts the Appduct tool set for the platform the app is actually running on. Each platform's
// tools are registered by its own component, so a hook only ever runs where the Voltra API it
// drives exists, and `appduct tools` lists exactly the tools this device can serve.
import { Platform } from 'react-native'

import { AndroidVoltraTools } from './AndroidVoltraTools'
import { IosVoltraTools } from './IosVoltraTools'

export function AppductTools() {
  if (Platform.OS === 'android') {
    return <AndroidVoltraTools />
  }

  if (Platform.OS === 'ios') {
    return <IosVoltraTools />
  }

  return null
}
