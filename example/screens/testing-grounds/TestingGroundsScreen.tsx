import { Platform } from 'react-native'

import AndroidOthersScreen from '~/screens/android/tabs/OthersScreen'
import IOSOthersScreen from '~/screens/ios/tabs/OthersScreen'

export default function TestingGroundsScreen() {
  return Platform.OS === 'android' ? <AndroidOthersScreen /> : <IOSOthersScreen />
}
