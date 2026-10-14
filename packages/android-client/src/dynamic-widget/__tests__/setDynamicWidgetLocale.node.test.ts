import { getNativeVoltraAndroid, type Spec } from '../../native/NativeVoltraAndroid.js'

import { setDynamicWidgetLocale } from '../api.js'

jest.mock('../../native/NativeVoltraAndroid.js', () => ({
  getNativeVoltraAndroid: jest.fn(),
}))

const mockedGetNativeVoltraAndroid = jest.mocked(getNativeVoltraAndroid)

describe('setDynamicWidgetLocale', () => {
  const nativeSetDynamicWidgetLocale = jest.fn<Promise<void>, [string | null]>()

  beforeEach(() => {
    nativeSetDynamicWidgetLocale.mockReset()
    nativeSetDynamicWidgetLocale.mockResolvedValue(undefined)
    mockedGetNativeVoltraAndroid.mockReturnValue({
      setDynamicWidgetLocale: nativeSetDynamicWidgetLocale,
    } as unknown as Spec)
  })

  it('forwards a BCP-47 tag, turning ICU underscores into hyphens', async () => {
    await setDynamicWidgetLocale('pt_BR')

    expect(nativeSetDynamicWidgetLocale).toHaveBeenCalledWith('pt-BR')
  })

  it('clears the override for null or a blank tag', async () => {
    await setDynamicWidgetLocale(null)
    await setDynamicWidgetLocale('  ')

    expect(nativeSetDynamicWidgetLocale).toHaveBeenNthCalledWith(1, null)
    expect(nativeSetDynamicWidgetLocale).toHaveBeenNthCalledWith(2, null)
  })
})
