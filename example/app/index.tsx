import { Redirect } from 'expo-router'
import { Platform } from 'react-native'

export default function Index() {
  const href = Platform.OS === 'android' ? '/android-widgets' : '/live-activities'
  return <Redirect href={href} />
}
