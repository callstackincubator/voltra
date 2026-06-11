import { Stack } from 'expo-router'
import { SafeAreaProvider } from 'react-native-safe-area-context'
import { enableWidgetHotReload } from '@use-voltra/ios-client'

import { useVoltraEvents } from '~/hooks/useVoltraEvents'
import { useServerDrivenWidgetToken } from '~/hooks/useServerDrivenWidgetToken'
import { updateAndroidVoltraWidget } from '~/widgets/android/updateAndroidVoltraWidget'

// Dev hot reload: the Voltra widget registry generates a per-platform barrel (see
// metro/widgetRegistry.js) that side-effect-imports every 'use voltra' widget. Importing it keeps
// those widgets in the host app's Metro graph, so Fast Refresh detects edits and refreshes the
// home-screen widgets. Dev-only, so production bundles don't pull the widget sources into the app.
if (__DEV__) {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  require('../.voltra/metro/widgets-dev-barrel')
}

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
