import React from 'react'
import { StyleSheet, View } from 'react-native'

import { SymbolView } from './src/jsx/Primitives'

/**
 * Test file demonstrating SymbolView component with API parity to expo-symbols
 * This showcases various SF Symbol configurations and usage patterns
 */
export default function ExpoSymbolViewTest() {
  return (
    <View style={styles.container}>
      {/* Basic monochrome symbol */}
      <SymbolView name="airpods.chargingcase" style={styles.symbol} type="monochrome" size={35} />

      {/* Hierarchical symbol with tint color */}
      <SymbolView name="heart.fill" style={styles.symbol} type="hierarchical" tintColor="red" size={40} scale="large" />

      {/* Palette symbol with multiple colors */}
      <SymbolView
        name="person.3.fill"
        style={styles.symbol}
        type="palette"
        colors={['blue', 'green', 'orange']}
        size={45}
        weight="bold"
      />

      {/* Multicolor symbol */}
      <SymbolView name="rainbow" style={styles.symbol} type="multicolor" size={50} scale="medium" />

      {/* Symbol with animation */}
      <SymbolView
        name="wifi"
        style={styles.symbol}
        type="hierarchical"
        tintColor="blue"
        size={35}
        animationSpec={{
          effect: {
            type: 'pulse',
            wholeSymbol: true,
          },
          repeating: true,
          speed: 1.0,
        }}
      />

      {/* Symbol with different weights and scales */}
      <SymbolView
        name="star.fill"
        style={styles.symbol}
        type="monochrome"
        tintColor="gold"
        size={30}
        weight="ultraLight"
        scale="small"
      />

      <SymbolView
        name="star.fill"
        style={styles.symbol}
        type="monochrome"
        tintColor="gold"
        size={40}
        weight="regular"
        scale="medium"
      />

      <SymbolView
        name="star.fill"
        style={styles.symbol}
        type="monochrome"
        tintColor="gold"
        size={50}
        weight="black"
        scale="large"
      />

      {/* Symbol with resize mode */}
      <SymbolView
        name="photo"
        style={styles.largeSymbol}
        type="hierarchical"
        tintColor="purple"
        size={60}
        resizeMode="scaleAspectFit"
      />

      {/* Complex animation example */}
      <SymbolView
        name="bolt.fill"
        style={styles.symbol}
        type="hierarchical"
        tintColor="yellow"
        size={35}
        animationSpec={{
          effect: {
            type: 'bounce',
            direction: 'up',
            wholeSymbol: false,
          },
          repeating: true,
          repeatCount: 3,
          speed: 0.5,
          variableAnimationSpec: {
            cumulative: true,
            dimInactiveLayers: true,
          },
        }}
      />
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    flexWrap: 'wrap',
    padding: 20,
  },
  symbol: {
    width: 35,
    height: 35,
    margin: 5,
  },
  largeSymbol: {
    width: 60,
    height: 60,
    margin: 10,
  },
})

/**
 * Usage Examples:
 *
 * 1. Basic Symbol:
 * <SymbolView name="heart" type="monochrome" size={24} />
 *
 * 2. Colored Symbol:
 * <SymbolView name="heart.fill" type="hierarchical" tintColor="red" />
 *
 * 3. Palette Symbol:
 * <SymbolView name="person.3.fill" type="palette" colors={['blue', 'green', 'red']} />
 *
 * 4. Animated Symbol:
 * <SymbolView
 *   name="wifi"
 *   animationSpec={{
 *     effect: { type: 'pulse' },
 *     repeating: true
 *   }}
 * />
 *
 * 5. Weighted Symbol:
 * <SymbolView name="star" weight="bold" scale="large" />
 */
