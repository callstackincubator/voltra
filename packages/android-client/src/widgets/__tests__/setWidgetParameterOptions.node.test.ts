import { getNativeVoltraAndroid, type Spec } from '../../native/NativeVoltraAndroid.js'

import { setWidgetParameterOptions, type WidgetParameterOption } from '../api.js'

jest.mock('../../native/NativeVoltraAndroid.js', () => ({
  getNativeVoltraAndroid: jest.fn(),
}))

const mockedGetNativeVoltraAndroid = jest.mocked(getNativeVoltraAndroid)

describe('setWidgetParameterOptions', () => {
  const nativeSetWidgetParameterOptions = jest.fn<Promise<void>, [string, string, string]>()

  beforeEach(() => {
    nativeSetWidgetParameterOptions.mockResolvedValue(undefined)
    mockedGetNativeVoltraAndroid.mockReturnValue({
      setWidgetParameterOptions: nativeSetWidgetParameterOptions,
    } as unknown as Spec)
  })

  afterEach(() => {
    jest.clearAllMocks()
  })

  it('forwards the options as JSON', async () => {
    const options = [
      { value: '1', title: 'One' },
      { value: '2', title: 'Two' },
    ]

    await setWidgetParameterOptions('masjid', 'masjid', options)

    expect(nativeSetWidgetParameterOptions).toHaveBeenCalledWith('masjid', 'masjid', JSON.stringify(options))
  })

  it.each([
    ['an empty value', [{ value: '', title: 'None' }], 'cannot be empty'],
    [
      'a duplicate value',
      [
        { value: '1', title: 'One' },
        { value: '1', title: 'Uno' },
      ],
      'duplicate option value "1"',
    ],
    ['a non-string value', [{ value: 1, title: 'One' }], 'string value and title'],
    ['a non-string title', [{ value: '1', title: null }], 'string value and title'],
  ])('rejects %s', async (_, options, message) => {
    await expect(
      setWidgetParameterOptions('masjid', 'masjid', options as unknown as WidgetParameterOption[])
    ).rejects.toThrow(message)
    expect(nativeSetWidgetParameterOptions).not.toHaveBeenCalled()
  })
})
