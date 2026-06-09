import { Stack } from 'expo-router'
import { SafeAreaProvider } from 'react-native-safe-area-context'
import { enableWidgetHotReload } from '@use-voltra/ios-client'

import { useVoltraEvents } from '~/hooks/useVoltraEvents'
import { useServerDrivenWidgetToken } from '~/hooks/useServerDrivenWidgetToken'
import { updateAndroidVoltraWidget } from '~/widgets/android/updateAndroidVoltraWidget'

// Side-effect imports so Metro's widget registry can see every 'use voltra' file
// in its dep graph. Without an import path reachable from the main bundle entry,
// Metro returns 404 for /voltra/widgets/<id>.bundle and the widget extension
// can't fetch the bundle.
import '~/widgets/ios/ClientRenderedDemoWidget'

enableWidgetHotReload()
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
