import { Stack } from 'expo-router'
import { Platform } from 'react-native'
import { SafeAreaProvider } from 'react-native-safe-area-context'
import { enableClientWidgetHotReload } from '@use-voltra/ios-client'

import { useVoltraEvents } from '~/hooks/useVoltraEvents'
import { useServerDrivenWidgetToken } from '~/hooks/useServerDrivenWidgetToken'
import { updateAndroidVoltraWidget } from '~/widgets/android/updateAndroidVoltraWidget'

updateAndroidVoltraWidget({ width: 300, height: 200 })

// Track 5 — when the corresponding `clientWidgetHotReload` flag in app.json is on,
// subscribe to Metro HMR and call WidgetCenter.reloadAllTimelines() on every save so
// client-rendered widget JSX changes reach the home-screen widget within seconds.
if (__DEV__ && Platform.OS === 'ios') {
  enableClientWidgetHotReload()
}

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
