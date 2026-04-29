import { Stack } from 'expo-router'
import { useEffect } from 'react'
import { Platform } from 'react-native'
import { SafeAreaProvider } from 'react-native-safe-area-context'
import { reloadWidgets, updateWidget } from 'voltra/client'

import { BackgroundWrapper } from '~/components/BackgroundWrapper'
import { useVoltraEvents } from '~/hooks/useVoltraEvents'
import { updateAndroidVoltraWidget } from '~/widgets/android/updateAndroidVoltraWidget'
import { resolvablePlaygroundVariants } from '~/widgets/ios/IosResolvablePlaygroundWidget'

updateAndroidVoltraWidget({ width: 300, height: 200 })

const STACK_SCREEN_OPTIONS = {
  headerShown: false,
  contentStyle: { backgroundColor: 'transparent' },
}

export const unstable_settings = {
  initialRouteName: 'index',
}

export default function Layout() {
  useVoltraEvents()

  useEffect(() => {
    if (Platform.OS !== 'ios') {
      return
    }
    void (async () => {
      try {
        await updateWidget('resolvable_playground', resolvablePlaygroundVariants)
        await reloadWidgets(['resolvable_playground'])
      } catch {
        // Widget host may be unavailable (e.g. simulator without extension).
      }
    })()
  }, [])

  return (
    <SafeAreaProvider>
      <Stack
        screenOptions={STACK_SCREEN_OPTIONS}
        screenLayout={({ children }) => <BackgroundWrapper>{children}</BackgroundWrapper>}
      >
        <Stack.Screen
          name="voltraui/[activityName]"
          options={{
            presentation: 'formSheet',
            headerShown: false,
            sheetAllowedDetents: 'fitToContents',
          }}
        />
        <Stack.Screen name="live-activities" />
        <Stack.Screen name="android-widgets" />
        <Stack.Screen name="testing-grounds" />
        <Stack.Screen name="+not-found" />
      </Stack>
    </SafeAreaProvider>
  )
}
