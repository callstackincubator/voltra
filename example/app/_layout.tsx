import { Stack } from 'expo-router'

import { BackgroundWrapper } from '~/components/BackgroundWrapper'
import { useVoltraEvents } from '~/hooks/useVoltraEvents'

const STACK_SCREEN_OPTIONS = {
  headerShown: false,
  contentStyle: { backgroundColor: 'transparent' },
}

export const unstable_settings = {
  initialRouteName: 'live-activities',
}

export default function Layout() {
  useVoltraEvents()

  return (
    <Stack
      screenOptions={STACK_SCREEN_OPTIONS}
      screenLayout={({ children }) => <BackgroundWrapper>{children}</BackgroundWrapper>}
    >
      <Stack.Screen
        name="voltraui/[activityId]"
        options={{
          presentation: 'formSheet',
          headerShown: false,
          sheetAllowedDetents: 'fitToContents',
        }}
      />
      <Stack.Screen name="live-activities" />
      <Stack.Screen name="testing-grounds" />
      <Stack.Screen name="+not-found" />
    </Stack>
  )
}
