import { Platform } from 'react-native'

import { getNativeVoltra, type Spec } from '../../src/native/NativeVoltra.js'

import { setDynamicWidgetLocale } from '../../src/dynamic-widget/api.js'

jest.mock('react-native', () => ({
  Platform: { OS: 'ios' },
}))

jest.mock('../../src/native/NativeVoltra.js', () => ({
  getNativeVoltra: jest.fn(),
}))

const mockedGetNativeVoltra = jest.mocked(getNativeVoltra)
const mockedPlatform = Platform as { OS: string }

describe('setDynamicWidgetLocale', () => {
  const nativeSetDynamicWidgetLocale = jest.fn<Promise<void>, [string | null]>()

  beforeEach(() => {
    nativeSetDynamicWidgetLocale.mockResolvedValue(undefined)
    mockedGetNativeVoltra.mockReturnValue({
      setDynamicWidgetLocale: nativeSetDynamicWidgetLocale,
    } as unknown as Spec)
  })

  afterEach(() => {
    mockedPlatform.OS = 'ios'
    jest.clearAllMocks()
  })

  it('forwards a BCP-47 tag, turning ICU underscores into hyphens', async () => {
    await setDynamicWidgetLocale('pl_PL')

    expect(nativeSetDynamicWidgetLocale).toHaveBeenCalledWith('pl-PL')
  })

  it('clears the override for null or a blank tag', async () => {
    await setDynamicWidgetLocale(null)
    await setDynamicWidgetLocale('')

    expect(nativeSetDynamicWidgetLocale).toHaveBeenNthCalledWith(1, null)
    expect(nativeSetDynamicWidgetLocale).toHaveBeenNthCalledWith(2, null)
  })

  it('propagates a rejection when the App Group is not configured', async () => {
    nativeSetDynamicWidgetLocale.mockRejectedValue(new Error('App Group not configured'))

    await expect(setDynamicWidgetLocale('pl')).rejects.toThrow('App Group not configured')
  })

  it('is a no-op off Apple platforms', async () => {
    mockedPlatform.OS = 'android'
    const consoleError = jest.spyOn(console, 'error').mockImplementation(() => undefined)

    await setDynamicWidgetLocale('pl')

    expect(nativeSetDynamicWidgetLocale).not.toHaveBeenCalled()
    consoleError.mockRestore()
  })
})
