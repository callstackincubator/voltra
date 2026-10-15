import type { VoltraActivityEnablementChangedEvent, VoltraInteractionEvent } from '../../src/events.js'

jest.mock('react-native', () => ({
  Platform: { OS: 'ios' },
  AppState: { addEventListener: jest.fn() },
}))
jest.mock('../../src/VoltraModule.js', () => ({ getNativeVoltra: jest.fn() }))

type Tap = Omit<VoltraInteractionEvent, 'type' | 'timestamp' | 'payload'>

const tap = (id: string, source = 'order-123'): VoltraInteractionEvent => ({
  type: 'interaction',
  id,
  source,
  identifier: `button-${id}`,
  payload: '',
  timestamp: 1,
})

// Each test gets fresh module state, as a new JavaScript instance after a reload would.
const setup = (queued: VoltraInteractionEvent[] = []) => {
  jest.resetModules()
  const { AppState } = require('react-native') as typeof import('react-native')
  const { getNativeVoltra } = require('../../src/VoltraModule.js') as typeof import('../../src/VoltraModule.js')
  const { addVoltraListener } = require('../../src/events.js') as typeof import('../../src/events.js')
  const { subscribeToInteractions } = require('../../src/interactions.js') as typeof import('../../src/interactions.js')

  const queue = [...queued]
  let signal: (() => void) | undefined
  const signalSubscription = { remove: jest.fn(() => (signal = undefined)) }
  let appStateListener: ((state: string) => void) | undefined
  const appStateSubscription = { remove: jest.fn(() => (appStateListener = undefined)) }
  jest.mocked(AppState.addEventListener).mockImplementation(((_: string, listener: (state: string) => void) => {
    appStateListener = listener
    return appStateSubscription
  }) as unknown as typeof AppState.addEventListener)

  const popInteractions = jest.fn((sources?: string[] | null) => {
    const taken = queue.filter((event) => !sources || sources.includes(event.source))
    for (const event of taken) queue.splice(queue.indexOf(event), 1)
    return taken
  })
  const onInteractionsAvailable = jest.fn((handler: () => void) => {
    signal = handler
    return signalSubscription
  })
  const restoreInteractions = jest.fn((events: VoltraInteractionEvent[]) => {
    queue.unshift(...events)
    return true
  })
  const native = { popInteractions, restoreInteractions, onInteractionsAvailable, onInteraction: jest.fn() }
  jest.mocked(getNativeVoltra).mockReturnValue(native as never)

  return {
    addVoltraListener,
    subscribeToInteractions,
    native,
    queue,
    record: (event: VoltraInteractionEvent) => {
      queue.push(event)
      signal?.()
    },
    foreground: () => appStateListener?.('active'),
    signalSubscription,
    appStateSubscription,
  }
}

const ids = (listener: jest.Mock) => listener.mock.calls.map(([event]: [Tap]) => event.id)

// Pumps run on a microtask after the call that scheduled them.
const flush = () => new Promise((resolve) => setImmediate(resolve))

describe('interaction delivery', () => {
  afterEach(() => {
    jest.restoreAllMocks()
  })

  it('takes queued taps, oldest first, after the first listener attaches', async () => {
    const { addVoltraListener, queue } = setup([tap('1'), tap('2')])
    const listener = jest.fn()

    addVoltraListener('interaction', listener)
    expect(listener).not.toHaveBeenCalled()
    await flush()

    expect(ids(listener)).toEqual(['1', '2'])
    expect(queue).toEqual([])
  })

  it('lets a listener refer to its own subscription when a tap is already queued', async () => {
    const { addVoltraListener } = setup([tap('1')])
    const error = jest.spyOn(console, 'error').mockImplementation(() => {})
    const received: string[] = []

    const subscription = addVoltraListener('interaction', (event) => {
      received.push(event.id)
      subscription.remove()
    })
    await flush()

    expect(received).toEqual(['1'])
    expect(error).not.toHaveBeenCalled()
  })

  it('delivers a newly recorded tap once to every listener, in one pop', async () => {
    const { addVoltraListener, record, native } = setup()
    const first = jest.fn()
    const second = jest.fn()
    addVoltraListener('interaction', first)
    addVoltraListener('interaction', second)
    await flush()
    native.popInteractions.mockClear()

    record(tap('1'))
    record(tap('2'))
    await flush()

    expect(ids(first)).toEqual(['1', '2'])
    expect(ids(second)).toEqual(['1', '2'])
    expect(native.popInteractions).toHaveBeenCalledTimes(1)
    expect(native.onInteractionsAvailable).toHaveBeenCalledTimes(1)
  })

  it('takes taps recorded while the app was in the background when it becomes active', async () => {
    const { addVoltraListener, queue, foreground } = setup()
    const listener = jest.fn()
    addVoltraListener('interaction', listener)
    await flush()

    // Recorded by another process: no signal reached this instance.
    queue.push(tap('1'))
    foreground()
    await flush()

    expect(ids(listener)).toEqual(['1'])
  })

  it('leaves taps queued while nobody listens, and stops listening for signals', async () => {
    const { addVoltraListener, record, queue, native, signalSubscription, appStateSubscription } = setup()
    const listener = jest.fn()
    addVoltraListener('interaction', listener).remove()

    record(tap('1'))
    await flush()

    expect(listener).not.toHaveBeenCalled()
    expect(queue).toHaveLength(1)
    expect(signalSubscription.remove).toHaveBeenCalledTimes(1)
    expect(appStateSubscription.remove).toHaveBeenCalledTimes(1)
    expect(native.popInteractions).not.toHaveBeenCalled()
  })

  it('puts back taps whose last listener went away during the dispatch', async () => {
    const { addVoltraListener, queue, native } = setup([tap('1'), tap('2'), tap('3')])
    const subscription = addVoltraListener('interaction', (event) => {
      if (event.id === '1') subscription.remove()
    })
    await flush()

    expect(native.restoreInteractions).toHaveBeenCalledTimes(1)
    expect(queue.map((event) => event.id)).toEqual(['2', '3'])
  })

  it('lets a source-filtered subscriber (VoltraView) take only its own taps', async () => {
    const { addVoltraListener, subscribeToInteractions, queue } = setup([
      tap('live-activity', 'order-123'),
      tap('view', 'voltra-view-1'),
    ])
    const viewListener = jest.fn()

    subscribeToInteractions(viewListener, 'voltra-view-1')
    await flush()

    expect(ids(viewListener)).toEqual(['view'])
    expect(queue.map((event) => event.id)).toEqual(['live-activity'])

    const appListener = jest.fn()
    addVoltraListener('interaction', appListener)
    await flush()
    expect(ids(appListener)).toEqual(['live-activity'])
    expect(ids(viewListener)).toEqual(['view'])
  })

  it('keeps dispatching to other listeners when one throws', async () => {
    const { addVoltraListener, record } = setup()
    const error = jest.spyOn(console, 'error').mockImplementation(() => {})
    const listener = jest.fn()
    addVoltraListener('interaction', () => {
      throw new Error('boom')
    })
    addVoltraListener('interaction', listener)

    record(tap('1'))
    await flush()

    expect(ids(listener)).toEqual(['1'])
    expect(error).toHaveBeenCalled()
  })

  it('keeps taps in order when a listener subscribes during dispatch', async () => {
    const { addVoltraListener, queue } = setup([tap('1'), tap('2', 'voltra-view-1')])
    const late = jest.fn()
    const order: string[] = []
    addVoltraListener('interaction', (event) => {
      order.push(event.id)
      if (event.id === '1') {
        queue.push(tap('3'))
        addVoltraListener('interaction', late)
      }
    })
    await flush()

    expect(order).toEqual(['1', '2', '3'])
    // Subscribed before '2' was dispatched, so it receives the rest of the batch, then '3'.
    expect(ids(late)).toEqual(['2', '3'])
  })

  it('does not throw when reading the queue fails', async () => {
    const { addVoltraListener, native } = setup()
    const error = jest.spyOn(console, 'error').mockImplementation(() => {})
    native.popInteractions.mockImplementation(() => {
      throw new Error('unavailable')
    })

    expect(() => addVoltraListener('interaction', jest.fn())).not.toThrow()
    await flush()
    expect(error).toHaveBeenCalled()
  })

  it('falls back to direct delivery on a native build without the queue', () => {
    const { addVoltraListener, subscribeToInteractions, native } = setup()
    const subscription = { remove: jest.fn() }
    const emitters: ((event: Omit<VoltraInteractionEvent, 'id'>) => void)[] = []
    native.onInteraction.mockImplementation((handler) => {
      emitters.push(handler)
      return subscription
    })
    ;(native as { popInteractions?: unknown }).popInteractions = undefined

    const listener = jest.fn()
    const viewListener = jest.fn()
    expect(addVoltraListener('interaction', listener)).toBe(subscription)
    subscribeToInteractions(viewListener, 'voltra-view-1')
    const { id: _, ...event } = tap('ignored')
    emitters.forEach((emit) => emit(event))

    expect(listener).toHaveBeenCalledWith(expect.objectContaining({ id: '1:order-123:button-ignored' }))
    expect(viewListener).not.toHaveBeenCalled()
  })
})

describe('activityEnablementChanged', () => {
  it('subscribes through the dedicated native emitter', () => {
    const { addVoltraListener, native } = setup()
    const subscription = { remove: jest.fn() }
    const onActivityEnablementChanged = jest.fn(() => subscription)
    Object.assign(native, { onActivityEnablementChanged })
    const listener = jest.fn<void, [VoltraActivityEnablementChangedEvent]>()

    expect(addVoltraListener('activityEnablementChanged', listener)).toBe(subscription)
    expect(onActivityEnablementChanged).toHaveBeenCalledWith(listener)
  })

  it('returns a no-op subscription on a native build without the emitter', () => {
    const { addVoltraListener } = setup()
    const warn = jest.spyOn(console, 'warn').mockImplementation(() => {})

    const subscription = addVoltraListener('activityEnablementChanged', jest.fn())

    expect(() => subscription.remove()).not.toThrow()
    expect(warn).toHaveBeenCalled()
    warn.mockRestore()
  })
})
