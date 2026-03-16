import { Platform } from 'react-native'

export const assertRunningOnApple = (): boolean => {
  if (Platform.OS !== 'ios') {
    console.error(`Voltra is available only on iOS!`)
    return false
  }

  return true
}
