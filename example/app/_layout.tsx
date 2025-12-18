import { Stack } from 'expo-router'

import { BackgroundWrapper } from '~/components/BackgroundWrapper'
import { useVoltraEvents } from '~/hooks/useVoltraEvents'
import { useVoltraWidgets } from '~/hooks/useVoltraWidgets'

const STACK_SCREEN_OPTIONS = {
  headerShown: false,
  contentStyle: { backgroundColor: 'transparent' },
}

export const unstable_settings = {
  initialRouteName: 'live-activities',
}

export default function Layout() {
  useVoltraEvents()
  useVoltraWidgets()

  return (
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
      <Stack.Screen name="testing-grounds" />
      <Stack.Screen name="widget-playground" />
      <Stack.Screen name="+not-found" />
    </Stack>
  )
}
