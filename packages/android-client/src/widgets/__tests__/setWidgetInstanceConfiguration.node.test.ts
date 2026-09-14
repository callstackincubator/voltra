import { getNativeVoltraAndroid, type Spec } from '../../native/NativeVoltraAndroid.js'

import { setWidgetInstanceConfiguration } from '../api.js'

jest.mock('../../native/NativeVoltraAndroid.js', () => ({
  getNativeVoltraAndroid: jest.fn(),
}))

const mockedGetNativeVoltraAndroid = jest.mocked(getNativeVoltraAndroid)

const mockNative = () => {
  const nativeSetWidgetInstanceConfiguration = jest.fn<Promise<void>, [number, string]>()
  nativeSetWidgetInstanceConfiguration.mockResolvedValue(undefined)
  mockedGetNativeVoltraAndroid.mockReturnValue({
    setWidgetInstanceConfiguration: nativeSetWidgetInstanceConfiguration,
  } as unknown as Spec)
  return nativeSetWidgetInstanceConfiguration
}

describe('setWidgetInstanceConfiguration', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('sends a single key and value as a one-entry JSON object', async () => {
    const native = mockNative()

    await setWidgetInstanceConfiguration(42, 'label', 'London')

    expect(native).toHaveBeenCalledWith(42, JSON.stringify({ label: 'London' }))
  })

  it('sends every key of the object form in one call, so a multi-key write costs one re-render', async () => {
    const native = mockNative()

    await setWidgetInstanceConfiguration(42, { label: 'London', units: 'celsius' })

    expect(native).toHaveBeenCalledTimes(1)
    expect(native).toHaveBeenCalledWith(42, JSON.stringify({ label: 'London', units: 'celsius' }))
  })

  it('sends an empty object unchanged rather than treating it as a clear', async () => {
    const native = mockNative()

    await setWidgetInstanceConfiguration(42, {})

    expect(native).toHaveBeenCalledWith(42, '{}')
  })

  it('rejects a non-string value before it crosses the bridge, naming the offending key', async () => {
    const native = mockNative()

    await expect(
      setWidgetInstanceConfiguration(42, { label: 'London', units: 7 as unknown as string })
    ).rejects.toThrow(/"units" is number/)

    expect(native).not.toHaveBeenCalled()
  })

  it('rejects a null value, which the bridge would otherwise coerce to a string', async () => {
    const native = mockNative()

    await expect(setWidgetInstanceConfiguration(42, 'label', null as unknown as string)).rejects.toThrow(
      /"label" is object/
    )

    expect(native).not.toHaveBeenCalled()
  })

  it('rejects an omitted value in the key/value form rather than storing "undefined"', async () => {
    const native = mockNative()

    await expect(setWidgetInstanceConfiguration(42, 'label', undefined as unknown as string)).rejects.toThrow(
      /"label" is undefined/
    )

    expect(native).not.toHaveBeenCalled()
  })
})
