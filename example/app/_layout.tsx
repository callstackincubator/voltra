import { Stack } from 'expo-router'
import { Image, StyleSheet, useWindowDimensions } from 'react-native'

import { useVoltraEvents } from '~/hooks/useVoltraEvents'

const STACK_SCREEN_OPTIONS = {
  headerShown: false,
  contentStyle: { backgroundColor: 'transparent' },
}

export const unstable_settings = {
  initialRouteName: 'live-activities',
}

export default function Layout() {
  const { width, height } = useWindowDimensions()

  useVoltraEvents()

  return (
    <>
      <Image
        source={require('../assets/voltra-splash.jpg')}
        style={[styles.image, { width, height }]}
        resizeMode="cover"
      />

      <Stack screenOptions={STACK_SCREEN_OPTIONS}>
        <Stack.Screen
          name="voltraui/[activityId]"
          options={{
            presentation: 'formSheet',
            headerShown: false,
            sheetAllowedDetents: 'fitToContents',
          }}
        />
        <Stack.Screen name="live-activities" />
        <Stack.Screen name="+not-found" />
      </Stack>
    </>
  )
}

const styles = StyleSheet.create({
  image: {
    position: 'absolute',
  },
})
