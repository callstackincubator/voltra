import { getNativeVoltraAndroid, type Spec } from '../../native/NativeVoltraAndroid.js'

import { updateAndroidDynamicWidget } from '../api.js'

jest.mock('../../native/NativeVoltraAndroid.js', () => ({
  getNativeVoltraAndroid: jest.fn(),
}))

const mockedGetNativeVoltraAndroid = jest.mocked(getNativeVoltraAndroid)

describe('updateAndroidDynamicWidget', () => {
  it('serializes nested Dynamic Widget props and forwards them to NativeVoltraAndroid', async () => {
    const nativeUpdateAndroidDynamicWidget = jest.fn<Promise<void>, [string, string]>()
    nativeUpdateAndroidDynamicWidget.mockResolvedValue(undefined)
    mockedGetNativeVoltraAndroid.mockReturnValue({
      updateAndroidDynamicWidget: nativeUpdateAndroidDynamicWidget,
    } as unknown as Spec)
    const dynamicWidgetProps = {
      title: 'Forecast',
      weather: {
        temperatures: [18, 21, 19],
        metadata: { units: 'celsius', severe: false, note: null },
      },
    }

    await updateAndroidDynamicWidget('weather-dynamic-widget', dynamicWidgetProps)

    expect(nativeUpdateAndroidDynamicWidget).toHaveBeenCalledWith(
      'weather-dynamic-widget',
      JSON.stringify(dynamicWidgetProps)
    )
  })
})
