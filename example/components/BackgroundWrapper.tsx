import React, { ReactNode } from 'react'
import { Image, StyleSheet, useWindowDimensions, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'

export type BackgroundWrapperProps = {
  children: ReactNode
}

export const BackgroundWrapper = ({ children }: BackgroundWrapperProps) => {
  const { width, height } = useWindowDimensions()

  return (
    <View style={styles.container}>
      <Image
        source={require('../assets/voltra-splash.jpg')}
        style={[styles.image, { width, height }]}
        resizeMode="cover"
      />
      <SafeAreaView style={styles.safeArea}>{children}</SafeAreaView>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
  },
  image: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: -1,
  },
})
