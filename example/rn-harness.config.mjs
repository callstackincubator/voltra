import { androidEmulator, androidPlatform } from '@react-native-harness/platform-android'
import { applePlatform, appleSimulator } from '@react-native-harness/platform-apple'

const config = {
  entryPoint: 'expo-router/entry',
  appRegistryComponentName: 'main',

  runners: [
    androidPlatform({
      name: 'android',
      device: androidEmulator('Pixel_9_Pro_API_35', {
        apiLevel: 35,
        profile: 'pixel_6',
        diskSize: '1G',
        heapSize: '1G',
      }),
      bundleId: 'com.callstackincubator.voltraexample',
    }),
    applePlatform({
      name: 'ios',
      device: appleSimulator('iPhone 16 Pro', '26.0'),
      bundleId: 'com.callstackincubator.voltraexample',
    }),
  ],
  defaultRunner: 'ios',
  resetEnvironmentBetweenTestFiles: false,
}

export default config
