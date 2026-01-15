import { Platform } from 'react-native'
import { updateAndroidWidget } from 'voltra/android/client'

import { AndroidVoltraWidget } from './AndroidVoltraWidget'

/**
 * Update the Android Voltra widget with the current launch time.
 *
 * @param size - The widget size dimensions
 */
export const updateAndroidVoltraWidget = async (size: { width: number; height: number }): Promise<void> => {
  if (Platform.OS !== 'android') {
    return
  }

  return updateAndroidWidget('voltra', [
    {
      size,
      content: <AndroidVoltraWidget time={new Date().toLocaleString()} />,
    },
  ]).catch((error) => {
    console.error('Failed to initialize Voltra widget:', error)
  })
}
