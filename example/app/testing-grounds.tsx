import { Redirect } from 'expo-router'
import { Platform } from 'react-native'

export default function TestingGroundsRedirect() {
  return <Redirect href={Platform.OS === 'android' ? '/android/others' : '/ios/others'} />
}
