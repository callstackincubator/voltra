import { addVoltraListener, type VoltraDynamicLiveActivityRenderFailedEvent } from '../../src/events.js'
import { getNativeVoltra, type Spec } from '../../src/VoltraModule.js'

jest.mock('react-native', () => ({ Platform: { OS: 'ios' } }))
jest.mock('../../src/VoltraModule.js', () => ({ getNativeVoltra: jest.fn() }))

const mockedGetNativeVoltra = jest.mocked(getNativeVoltra)

describe('Dynamic Live Activity render failure events', () => {
  afterEach(() => jest.clearAllMocks())

  it('subscribes through the dedicated native emitter with the exported event shape', () => {
    const subscription = { remove: jest.fn() }
    const onDynamicLiveActivityRenderFailed = jest.fn(() => subscription)
    mockedGetNativeVoltra.mockReturnValue({ onDynamicLiveActivityRenderFailed } as unknown as Spec)
    const listener = jest.fn<(event: VoltraDynamicLiveActivityRenderFailedEvent) => void>()

    const returned = addVoltraListener('dynamicLiveActivityRenderFailed', listener)

    expect(onDynamicLiveActivityRenderFailed).toHaveBeenCalledWith(listener)
    expect(returned).toBe(subscription)
  })
})
