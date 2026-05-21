import { useRouter } from 'expo-router'
import React from 'react'
import { StyleSheet, View } from 'react-native'

import { Button } from '~/components/Button'
import { Card } from '~/components/Card'
import { ScreenLayout } from '~/components/ScreenLayout'

import {
  AbsolutePositioningBasicExample,
  AbsolutePositioningCornersExample,
  BadgeOverlayExample,
  RelativePositioningBasicExample,
  RelativePositioningNegativeExample,
  StaticPositioningExample,
  ZIndexLayeringExample,
} from './PositioningExamples'

const POSITIONING_DATA = [
  {
    id: 'static-default',
    title: 'Static Positioning (Default)',
    description: 'When position is not set or set to "static", left and top are ignored. Box should stay centered.',
    Component: StaticPositioningExample,
  },
  {
    id: 'relative-basic',
    title: 'Relative Positioning - Basic',
    description:
      'position: "relative" offsets the box from its natural position. left: 20, top: 10 moves it right and down.',
    Component: RelativePositioningBasicExample,
  },
  {
    id: 'relative-negative',
    title: 'Relative Positioning - Negative Offset',
    description: 'Negative values move the box left (negative left) and up (negative top) from its natural position.',
    Component: RelativePositioningNegativeExample,
  },
  {
    id: 'absolute-basic',
    title: 'Absolute Positioning - Center-Based',
    description:
      'position: "absolute" places the CENTER of the box at the coordinates. left: 50, top: 50 means center at (50, 50).',
    Component: AbsolutePositioningBasicExample,
  },
  {
    id: 'absolute-corners',
    title: 'Absolute Positioning - Four Corners',
    description: 'Demonstrating absolute positioning at different coordinates. Red dots mark the center points.',
    Component: AbsolutePositioningCornersExample,
  },
  {
    id: 'zindex-layering',
    title: 'Z-Index Layering',
    description: 'Using zIndex with positioning to control stacking order.',
    Component: ZIndexLayeringExample,
  },
  {
    id: 'practical-overlay',
    title: 'Practical Example - Badge Overlay',
    description: 'Using absolute positioning to create a notification badge on a profile card.',
    Component: BadgeOverlayExample,
  },
]

export default function PositioningScreen() {
  const router = useRouter()

  return (
    <ScreenLayout
      title="Positioning"
      description="Learn about static, relative, and absolute positioning modes. See how left, top, and zIndex properties work with visual examples."
    >
      {POSITIONING_DATA.map((item) => {
        const { Component } = item
        return (
          <Card key={item.id}>
            <Card.Title>{item.title}</Card.Title>
            <Card.Text>{item.description}</Card.Text>
            <Component />
          </Card>
        )
      })}

      <View style={styles.footer}>
        <Button title="Back" variant="ghost" onPress={() => router.back()} />
      </View>
    </ScreenLayout>
  )
}

const styles = StyleSheet.create({
  footer: {
    marginTop: 24,
    alignItems: 'center',
  },
})
