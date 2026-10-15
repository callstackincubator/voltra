import { addVoltraListener, type VoltraActivityEnablementChangedEvent } from '../../src/events.js'
import { getNativeVoltra, type Spec } from '../../src/VoltraModule.js'

jest.mock('react-native', () => ({ Platform: { OS: 'ios' } }))
jest.mock('../../src/VoltraModule.js', () => ({ getNativeVoltra: jest.fn() }))

const mockedGetNativeVoltra = jest.mocked(getNativeVoltra)

const mockNative = () => {
  const subscriptions: { remove: jest.Mock }[] = []
  const onInteraction = jest.fn(() => {
    const subscription = { remove: jest.fn() }
    subscriptions.push(subscription)
    return subscription
  })
  const setInteractionListenerActive = jest.fn()
  const setDynamicLiveActivityRenderFailureListenerActive = jest.fn()
  const onDynamicLiveActivityRenderFailed = jest.fn(() => ({ remove: jest.fn() }))
  mockedGetNativeVoltra.mockReturnValue({
    onInteraction,
    setInteractionListenerActive,
    onDynamicLiveActivityRenderFailed,
    setDynamicLiveActivityRenderFailureListenerActive,
  } as unknown as Spec)
  return {
    onInteraction,
    setInteractionListenerActive,
    setDynamicLiveActivityRenderFailureListenerActive,
    subscriptions,
  }
}

describe('interaction listener counting', () => {
  afterEach(() => {
    jest.clearAllMocks()
  })

  it('attaches the emitter listener before asking native to drain queued interactions', () => {
    const { onInteraction, setInteractionListenerActive } = mockNative()
    const listener = jest.fn()

    const subscription = addVoltraListener('interaction', listener)

    expect(onInteraction).toHaveBeenCalledWith(listener)
    expect(setInteractionListenerActive).toHaveBeenCalledWith(true)
    expect(onInteraction.mock.invocationCallOrder[0]).toBeLessThan(
      setInteractionListenerActive.mock.invocationCallOrder[0]!
    )

    subscription.remove()
    expect(setInteractionListenerActive).toHaveBeenLastCalledWith(false)
  })

  it('tells native only when the first listener attaches and the last one leaves', () => {
    const { setInteractionListenerActive, subscriptions } = mockNative()

    const first = addVoltraListener('interaction', jest.fn())
    const second = addVoltraListener('interaction', jest.fn())
    expect(setInteractionListenerActive).toHaveBeenCalledTimes(1)

    first.remove()
    first.remove()
    expect(subscriptions[0]!.remove).toHaveBeenCalledTimes(1)
    expect(setInteractionListenerActive).toHaveBeenCalledTimes(1)

    second.remove()
    expect(setInteractionListenerActive).toHaveBeenCalledTimes(2)
    expect(setInteractionListenerActive).toHaveBeenLastCalledWith(false)

    const third = addVoltraListener('interaction', jest.fn())
    expect(setInteractionListenerActive).toHaveBeenLastCalledWith(true)
    third.remove()
  })

  it('counts interaction and render failure listeners independently', () => {
    const { setInteractionListenerActive, setDynamicLiveActivityRenderFailureListenerActive } = mockNative()

    const interaction = addVoltraListener('interaction', jest.fn())
    const renderFailure = addVoltraListener('dynamicLiveActivityRenderFailed', jest.fn())
    interaction.remove()

    expect(setInteractionListenerActive).toHaveBeenLastCalledWith(false)
    expect(setDynamicLiveActivityRenderFailureListenerActive).toHaveBeenCalledTimes(1)
    expect(setDynamicLiveActivityRenderFailureListenerActive).toHaveBeenLastCalledWith(true)
    renderFailure.remove()
  })
})

describe('activityEnablementChanged', () => {
  it('subscribes through the dedicated native emitter', () => {
    const subscription = { remove: jest.fn() }
    const onActivityEnablementChanged = jest.fn(() => subscription)
    mockedGetNativeVoltra.mockReturnValue({ onActivityEnablementChanged } as unknown as Spec)
    const listener = jest.fn<void, [VoltraActivityEnablementChangedEvent]>()

    const returned = addVoltraListener('activityEnablementChanged', listener)

    expect(onActivityEnablementChanged).toHaveBeenCalledWith(listener)
    expect(returned).toBe(subscription)
  })
})
