import { screen } from '@react-native-harness/ui'
import { View } from 'react-native'
import { afterAll, beforeAll, describe, expect, Mock, render, spyOn, test } from 'react-native-harness'
import { VoltraWidgetPreview } from 'voltra/client'

import { SAMPLE_WEATHER_DATA } from '../../widgets/weather-types'
import { WeatherWidget } from '../../widgets/WeatherWidget'

describe('Widget snapshots', () => {
  const mockDate = new Date('2026-01-20T08:00:00Z')
  let dateSpy: Mock<DateConstructor>

  beforeAll(() => {
    // Make sure the time is always the same for the widget snapshots
    dateSpy = spyOn(global, 'Date').mockImplementation(() => mockDate)
  })

  afterAll(() => {
    dateSpy.mockRestore()
  })

  const previewWrapperStyle = {
    backgroundColor: '#FFF',
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  } as const

  const previewStyle = { backgroundColor: '#000' } as const

  test('should match snapshot for Weather Widget - Sunny', async () => {
    await render(
      <View style={previewWrapperStyle}>
        <View testID="voltra-preview" style={previewStyle}>
          <VoltraWidgetPreview family="systemSmall">
            <WeatherWidget weather={SAMPLE_WEATHER_DATA.sunny} />
          </VoltraWidgetPreview>
        </View>
      </View>
    )

    const previewElement = await screen.findByTestId('voltra-preview')
    const screenshot = await screen.screenshot(previewElement)
    await expect(screenshot).toMatchImageSnapshot({
      name: 'weather-widget-sunny',
    })
  })

  test('should match snapshot for Weather Widget - Rainy', async () => {
    await render(
      <View style={previewWrapperStyle}>
        <View testID="voltra-preview" style={previewStyle}>
          <VoltraWidgetPreview family="systemSmall">
            <WeatherWidget weather={SAMPLE_WEATHER_DATA.rainy} />
          </VoltraWidgetPreview>
        </View>
      </View>
    )

    const previewElement = await screen.findByTestId('voltra-preview')
    const screenshot = await screen.screenshot(previewElement)
    await expect(screenshot).toMatchImageSnapshot({
      name: 'weather-widget-rainy',
    })
  })

  test('should match snapshot for Weather Widget - Snowy', async () => {
    await render(
      <View style={previewWrapperStyle}>
        <View testID="voltra-preview" style={previewStyle}>
          <VoltraWidgetPreview family="systemSmall">
            <WeatherWidget weather={SAMPLE_WEATHER_DATA.snowy} />
          </VoltraWidgetPreview>
        </View>
      </View>
    )

    const previewElement = await screen.findByTestId('voltra-preview')
    const screenshot = await screen.screenshot(previewElement)
    await expect(screenshot).toMatchImageSnapshot({
      name: 'weather-widget-snowy',
    })
  })

  test('should match snapshot for Weather Widget - Stormy', async () => {
    await render(
      <View style={previewWrapperStyle}>
        <View testID="voltra-preview" style={previewStyle}>
          <VoltraWidgetPreview family="systemSmall">
            <WeatherWidget weather={SAMPLE_WEATHER_DATA.stormy} />
          </VoltraWidgetPreview>
        </View>
      </View>
    )

    const previewElement = await screen.findByTestId('voltra-preview')
    const screenshot = await screen.screenshot(previewElement)
    await expect(screenshot).toMatchImageSnapshot({
      name: 'weather-widget-stormy',
    })
  })
})
