import { Stack } from 'expo-router'
import { Platform } from 'react-native'
import { SafeAreaProvider } from 'react-native-safe-area-context'
import {
  enableDynamicLiveActivityHotReload,
  enableWidgetHotReload as enableIosWidgetHotReload,
} from '@use-voltra/ios-client'
import { enableWidgetHotReload as enableAndroidWidgetHotReload } from '@use-voltra/android-client'
import '@use-voltra/widget-hot-reload'

import { useVoltraEvents } from '~/hooks/useVoltraEvents'
import { useServerDrivenWidgetToken } from '~/hooks/useServerDrivenWidgetToken'
import { updateAndroidVoltraWidget } from '~/widgets/android/updateAndroidVoltraWidget'

if (Platform.OS === 'android') {
  enableAndroidWidgetHotReload()
} else {
  enableIosWidgetHotReload()
  enableDynamicLiveActivityHotReload()
}
updateAndroidVoltraWidget({ width: 300, height: 200 })

const STACK_SCREEN_OPTIONS = {
  headerShown: false,
  contentStyle: { backgroundColor: '#020617' },
}

export const unstable_settings = {
  initialRouteName: 'index',
}

export default function Layout() {
  useVoltraEvents()
  useServerDrivenWidgetToken()

  return (
    <SafeAreaProvider>
      <Stack screenOptions={STACK_SCREEN_OPTIONS}>
        <Stack.Screen name="ios/(tabs)" />
        <Stack.Screen name="android/(tabs)" />
        <Stack.Screen
          name="voltraui/[activityName]"
          options={{
            presentation: 'formSheet',
            headerShown: false,
            sheetAllowedDetents: 'fitToContents',
          }}
        />
        <Stack.Screen name="+not-found" />
      </Stack>
    </SafeAreaProvider>
  )
}
