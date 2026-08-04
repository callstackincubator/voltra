import { addVoltraListener, type VoltraDynamicLiveActivityRenderFailedEvent } from '../../src/events.js'
import { getNativeVoltra, type Spec } from '../../src/VoltraModule.js'

jest.mock('react-native', () => ({ Platform: { OS: 'ios' } }))
jest.mock('../../src/VoltraModule.js', () => ({ getNativeVoltra: jest.fn() }))

const mockedGetNativeVoltra = jest.mocked(getNativeVoltra)

describe('Dynamic Live Activity render failure events', () => {
  afterEach(() => {
    jest.clearAllMocks()
  })

  it('subscribes through the dedicated native emitter with the exported event shape', () => {
    const subscription = { remove: jest.fn() }
    const onDynamicLiveActivityRenderFailed = jest.fn(() => subscription)
    const setDynamicLiveActivityRenderFailureListenerActive = jest.fn()
    mockedGetNativeVoltra.mockReturnValue({
      onDynamicLiveActivityRenderFailed,
      setDynamicLiveActivityRenderFailureListenerActive,
    } as unknown as Spec)
    const listener = jest.fn<(event: VoltraDynamicLiveActivityRenderFailedEvent) => void>()

    const returned = addVoltraListener('dynamicLiveActivityRenderFailed', listener)

    expect(onDynamicLiveActivityRenderFailed).toHaveBeenCalledWith(listener)
    expect(setDynamicLiveActivityRenderFailureListenerActive).toHaveBeenCalledWith(true)
    expect(onDynamicLiveActivityRenderFailed.mock.invocationCallOrder[0]).toBeLessThan(
      setDynamicLiveActivityRenderFailureListenerActive.mock.invocationCallOrder[0]!
    )
    returned.remove()
    expect(subscription.remove).toHaveBeenCalledTimes(1)
    expect(setDynamicLiveActivityRenderFailureListenerActive).toHaveBeenLastCalledWith(false)
  })

  it('keeps native delivery ready until the final listener is removed, then re-enables it on resubscribe', () => {
    const first = { remove: jest.fn() }
    const second = { remove: jest.fn() }
    const onDynamicLiveActivityRenderFailed = jest.fn().mockReturnValueOnce(first).mockReturnValueOnce(second)
    const setDynamicLiveActivityRenderFailureListenerActive = jest.fn()
    mockedGetNativeVoltra.mockReturnValue({
      onDynamicLiveActivityRenderFailed,
      setDynamicLiveActivityRenderFailureListenerActive,
    } as unknown as Spec)

    const firstSubscription = addVoltraListener('dynamicLiveActivityRenderFailed', jest.fn())
    const secondSubscription = addVoltraListener('dynamicLiveActivityRenderFailed', jest.fn())
    firstSubscription.remove()
    expect(setDynamicLiveActivityRenderFailureListenerActive).toHaveBeenCalledTimes(1)
    secondSubscription.remove()
    expect(setDynamicLiveActivityRenderFailureListenerActive).toHaveBeenLastCalledWith(false)

    addVoltraListener('dynamicLiveActivityRenderFailed', jest.fn())
    expect(setDynamicLiveActivityRenderFailureListenerActive).toHaveBeenLastCalledWith(true)
  })
})
