import { screen } from '@react-native-harness/ui'
import { ComponentType } from 'react'
import { View } from 'react-native'
import { describe, expect, render, test } from 'react-native-harness'

import {
  AbsolutePositioningBasicExample,
  AbsolutePositioningCornersExample,
  BadgeOverlayExample,
  RelativePositioningBasicExample,
  RelativePositioningNegativeExample,
  StaticPositioningExample,
  ZIndexLayeringExample,
} from '../../screens/testing-grounds/positioning/PositioningExamples'

const snapshotTest = (name: string, Component: ComponentType<{ testID?: string }>) => {
  return test(`should match snapshot for ${name}`, async () => {
    await render(
      <View style={{ width: '100%', height: '100%', alignItems: 'center', justifyContent: 'center' }}>
        <Component testID="preview" />
      </View>
    )

    const previewElement = await screen.findByTestId('preview')
    const screenshot = await screen.screenshot(previewElement)
    await expect(screenshot).toMatchImageSnapshot({
      name: name.toLowerCase().replace(/\s+/g, '-'),
    })
  })
}

describe('Positioning snapshots', () => {
  snapshotTest('Static Positioning', StaticPositioningExample)

  snapshotTest('Relative Positioning Basic', RelativePositioningBasicExample)

  snapshotTest('Relative Positioning Negative', RelativePositioningNegativeExample)

  snapshotTest('Absolute Positioning Basic', AbsolutePositioningBasicExample)

  snapshotTest('Absolute Positioning Corners', AbsolutePositioningCornersExample)

  snapshotTest('Z-Index Layering', ZIndexLayeringExample)

  snapshotTest('Badge Overlay', BadgeOverlayExample)
})
