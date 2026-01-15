import { Stack } from 'expo-router'
import { SafeAreaProvider } from 'react-native-safe-area-context'

import { BackgroundWrapper } from '~/components/BackgroundWrapper'
import { useVoltraEvents } from '~/hooks/useVoltraEvents'
import { updateAndroidVoltraWidget } from '~/widgets/updateAndroidVoltraWidget'

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
