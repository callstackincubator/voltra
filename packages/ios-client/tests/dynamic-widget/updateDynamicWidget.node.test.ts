import { Platform } from 'react-native'

import { getNativeVoltra, type Spec } from '../../src/native/NativeVoltra.js'

import { updateDynamicWidget } from '../../src/dynamic-widget/api.js'

jest.mock('react-native', () => ({
  Platform: { OS: 'ios' },
}))

jest.mock('../../src/native/NativeVoltra.js', () => ({
  getNativeVoltra: jest.fn(),
}))

const mockedGetNativeVoltra = jest.mocked(getNativeVoltra)
const mockedPlatform = Platform as { OS: string }

describe('updateDynamicWidget', () => {
  afterEach(() => {
    mockedPlatform.OS = 'ios'
    jest.clearAllMocks()
    jest.restoreAllMocks()
  })

  it('serializes nested Dynamic Widget props once and forwards them to NativeVoltra', async () => {
    const nativeUpdateDynamicWidget = jest.fn<Promise<void>, [string, string]>()
    nativeUpdateDynamicWidget.mockResolvedValue(undefined)
    mockedGetNativeVoltra.mockReturnValue({
      updateDynamicWidget: nativeUpdateDynamicWidget,
    } as unknown as Spec)
    const dynamicWidgetProps = {
      title: 'Forecast',
      weather: {
        temperatures: [18, 21, 19],
        metadata: { units: 'celsius', severe: false, note: null },
      },
    }
    const expectedDynamicWidgetPropsJson = JSON.stringify(dynamicWidgetProps)
    const stringifySpy = jest.spyOn(JSON, 'stringify')

    await updateDynamicWidget('ClientRenderedDemoWidget', dynamicWidgetProps)

    expect(stringifySpy).toHaveBeenCalledTimes(1)
    expect(nativeUpdateDynamicWidget).toHaveBeenCalledWith('ClientRenderedDemoWidget', expectedDynamicWidgetPropsJson)
  })

  it('propagates NativeVoltra Dynamic Widget update rejections', async () => {
    const nativeFailure = new Error('Dynamic Widget persistence failed')
    const nativeUpdateDynamicWidget = jest.fn<Promise<void>, [string, string]>()
    nativeUpdateDynamicWidget.mockRejectedValue(nativeFailure)
    mockedGetNativeVoltra.mockReturnValue({
      updateDynamicWidget: nativeUpdateDynamicWidget,
    } as unknown as Spec)

    await expect(updateDynamicWidget('failing-dynamic-widget', { value: 1 })).rejects.toBe(nativeFailure)
  })

  it('follows the iOS client convention and resolves without calling native on non-Apple platforms', async () => {
    mockedPlatform.OS = 'android'
    const consoleError = jest.spyOn(console, 'error').mockImplementation(() => undefined)

    await expect(updateDynamicWidget('ignored-dynamic-widget', { value: 1 })).resolves.toBeUndefined()

    expect(mockedGetNativeVoltra).not.toHaveBeenCalled()
    expect(consoleError).toHaveBeenCalledWith('Voltra is available only on iOS!')
  })
})
