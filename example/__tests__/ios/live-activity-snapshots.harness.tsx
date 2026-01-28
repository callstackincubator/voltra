import { screen } from '@react-native-harness/ui'
import { View } from 'react-native'
import { describe, expect, render, test } from 'react-native-harness'
import { VoltraLiveActivityPreview } from 'voltra/client'

import {
  BasicLiveActivityUI,
  CompassLiveActivityLockScreen,
  FlightLiveActivityLockScreen,
  LiquidGlassLiveActivityUI,
  MusicPlayerLiveActivityUI,
  SONGS,
  WorkoutLiveActivityUI,
} from '../../components/live-activities'

describe('Live Activity snapshots', () => {
  const previewWrapperStyle = {
    backgroundColor: '#FFF',
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  } as const

  const previewStyle = { backgroundColor: '#000' } as const

  test('should match snapshot for Basic Live Activity', async () => {
    await render(
      <View style={previewWrapperStyle}>
        <View testID="voltra-preview" style={previewStyle}>
          <VoltraLiveActivityPreview>
            <BasicLiveActivityUI />
          </VoltraLiveActivityPreview>
        </View>
      </View>
    )

    const previewElement = await screen.findByTestId('voltra-preview')
    const screenshot = await screen.screenshot(previewElement)
    await expect(screenshot).toMatchImageSnapshot({
      name: 'basic-live-activity-preview',
    })
  })

  test('should match snapshot for Music Player Live Activity', async () => {
    await render(
      <View style={previewWrapperStyle}>
        <View testID="voltra-preview" style={previewStyle}>
          <VoltraLiveActivityPreview>
            <MusicPlayerLiveActivityUI currentSong={SONGS[0]} isPlaying={true} />
          </VoltraLiveActivityPreview>
        </View>
      </View>
    )

    const previewElement = await screen.findByTestId('voltra-preview')
    const screenshot = await screen.screenshot(previewElement)
    await expect(screenshot).toMatchImageSnapshot({
      name: 'music-player-live-activity-preview',
    })
  })

  test('should match snapshot for Liquid Glass Live Activity', async () => {
    await render(
      <View style={previewWrapperStyle}>
        <View testID="voltra-preview" style={previewStyle}>
          <VoltraLiveActivityPreview>
            <LiquidGlassLiveActivityUI />
          </VoltraLiveActivityPreview>
        </View>
      </View>
    )

    const previewElement = await screen.findByTestId('voltra-preview')
    const screenshot = await screen.screenshot(previewElement)
    await expect(screenshot).toMatchImageSnapshot({
      name: 'liquid-glass-live-activity-preview',
    })
  })

  test('should match snapshot for Flight Tracker Live Activity', async () => {
    await render(
      <View style={previewWrapperStyle}>
        <View testID="voltra-preview" style={previewStyle}>
          <VoltraLiveActivityPreview>
            <FlightLiveActivityLockScreen />
          </VoltraLiveActivityPreview>
        </View>
      </View>
    )

    const previewElement = await screen.findByTestId('voltra-preview')
    const screenshot = await screen.screenshot(previewElement)
    await expect(screenshot).toMatchImageSnapshot({
      name: 'flight-tracker-live-activity-preview',
    })
  })

  test('should match snapshot for Workout Tracker Live Activity', async () => {
    await render(
      <View style={previewWrapperStyle}>
        <View testID="voltra-preview" style={previewStyle}>
          <VoltraLiveActivityPreview>
            <WorkoutLiveActivityUI heartRate={145} distance="5.2 km" pace="5:30" startTime={Date.now()} />
          </VoltraLiveActivityPreview>
        </View>
      </View>
    )

    const previewElement = await screen.findByTestId('voltra-preview')
    const screenshot = await screen.screenshot(previewElement)
    await expect(screenshot).toMatchImageSnapshot({
      name: 'workout-tracker-live-activity-preview',
    })
  })

  test('should match snapshot for Compass Live Activity', async () => {
    await render(
      <View style={previewWrapperStyle}>
        <View testID="voltra-preview" style={previewStyle}>
          <VoltraLiveActivityPreview>
            <CompassLiveActivityLockScreen heading={120} />
          </VoltraLiveActivityPreview>
        </View>
      </View>
    )

    const previewElement = await screen.findByTestId('voltra-preview')
    const screenshot = await screen.screenshot(previewElement)
    await expect(screenshot).toMatchImageSnapshot({
      name: 'compass-live-activity-preview',
    })
  })
})
