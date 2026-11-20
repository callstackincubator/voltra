jest.mock('react-native', () => ({
  Platform: { OS: 'android' },
  AppState: { addEventListener: jest.fn(() => ({ remove: jest.fn() })) },
}))

jest.mock('../../native/NativeVoltraAndroid.js', () => ({
  getNativeVoltraAndroid: jest.fn(),
}))

import { Platform } from 'react-native'

import type { addVoltraListener as AddVoltraListener } from '../../events.js'
import { getNativeVoltraAndroid, type Spec } from '../../native/NativeVoltraAndroid.js'

const mockedGetNativeVoltraAndroid = jest.mocked(getNativeVoltraAndroid)

type QueuedEvent = { type: string; [key: string]: unknown }

const flushMicrotasks = () => new Promise((resolve) => setImmediate(resolve))

// A native module whose queue is an in-memory array, as `popEvents`/`restoreEvents` see it.
const createNativeQueue = () => {
  let queue: QueuedEvent[] = []
  let signal: (() => void) | null = null
  const native = {
    popEvents: jest.fn((types: string[]) => {
      const taken = queue.filter((event) => types.includes(event.type))
      queue = queue.filter((event) => !types.includes(event.type))
      return JSON.stringify(taken)
    }),
    restoreEvents: jest.fn((eventsJson: string) => {
      queue = [...(JSON.parse(eventsJson) as QueuedEvent[]), ...queue]
      return true
    }),
    onEventsAvailable: jest.fn((listener: () => void) => {
      signal = listener
      return {
        remove: () => {
          signal = null
        },
      }
    }),
  }
  return {
    native,
    record: (event: QueuedEvent) => {
      queue.push(event)
      signal?.()
    },
    queued: () => queue,
  }
}

const removed = (appWidgetId: number) => ({
  type: 'widgetRemoved',
  source: 'widget',
  timestamp: 1_700_000_000_000 + appWidgetId,
  widgetType: 'weather',
  appWidgetId,
})

// Each test gets a fresh JavaScript runtime so the event channel's module state doesn't leak between tests.
const loadAddVoltraListener = (): typeof AddVoltraListener => {
  let loaded!: typeof AddVoltraListener
  jest.isolateModules(() => {
    loaded = (require('../../events.js') as { addVoltraListener: typeof AddVoltraListener }).addVoltraListener
  })
  return loaded
}

describe('addVoltraListener (Android client)', () => {
  afterEach(() => {
    jest.restoreAllMocks()
    mockedGetNativeVoltraAndroid.mockReset()
    ;(Platform as { OS: string }).OS = 'android'
  })

  it('keeps the iOS-only warning for iOS events on every platform', () => {
    for (const os of ['android', 'ios']) {
      ;(Platform as { OS: string }).OS = os
      const addVoltraListener = loadAddVoltraListener()
      const warn = jest.spyOn(console, 'warn').mockImplementation(() => {})

      const subscription = addVoltraListener('interaction', () => {})

      expect(warn).toHaveBeenCalledTimes(1)
      expect(warn).toHaveBeenCalledWith(
        "[Voltra] Event 'interaction' is only supported on iOS. Returning no-op subscription."
      )
      expect(() => subscription.remove()).not.toThrow()
      warn.mockRestore()
    }
  })

  it('warns for lifecycle events off Android and returns a no-op subscription', () => {
    ;(Platform as { OS: string }).OS = 'ios'
    const addVoltraListener = loadAddVoltraListener()
    const warn = jest.spyOn(console, 'warn').mockImplementation(() => {})

    addVoltraListener('widgetRemoved', () => {})
    addVoltraListener('widgetRemoved', () => {})
    const subscription = addVoltraListener('widgetAdded', () => {})

    expect(warn.mock.calls).toEqual([
      ["[Voltra] Event 'widgetRemoved' is only supported on Android. Returning no-op subscription."],
      ["[Voltra] Event 'widgetRemoved' is only supported on Android. Returning no-op subscription."],
      ["[Voltra] Event 'widgetAdded' is only supported on Android. Returning no-op subscription."],
    ])
    expect(mockedGetNativeVoltraAndroid).not.toHaveBeenCalled()
    expect(() => subscription.remove()).not.toThrow()
  })

  it('delivers queued events oldest first and stops after remove()', async () => {
    const channel = createNativeQueue()
    mockedGetNativeVoltraAndroid.mockReturnValue(channel.native as unknown as Spec)
    const addVoltraListener = loadAddVoltraListener()
    channel.record(removed(1))
    channel.record(removed(2))
    const received: unknown[] = []

    const subscription = addVoltraListener('widgetRemoved', (event) => received.push(event))
    expect(received).toEqual([])
    await flushMicrotasks()
    expect(received).toEqual([removed(1), removed(2)])

    channel.record(removed(3))
    await flushMicrotasks()
    expect(received).toEqual([removed(1), removed(2), removed(3)])

    subscription.remove()
    channel.record(removed(4))
    await flushMicrotasks()
    expect(received).toEqual([removed(1), removed(2), removed(3)])
    expect(channel.queued()).toEqual([removed(4)])
  })

  it('leaves events of types nobody listens to in the queue', async () => {
    const channel = createNativeQueue()
    mockedGetNativeVoltraAndroid.mockReturnValue(channel.native as unknown as Spec)
    const addVoltraListener = loadAddVoltraListener()
    const added = { type: 'widgetAdded', source: 'widget', timestamp: 1, widgetType: 'weather', appWidgetId: 9 }
    channel.record(added)
    channel.record(removed(1))
    const received: unknown[] = []

    addVoltraListener('widgetRemoved', (event) => received.push(event))
    await flushMicrotasks()

    expect(received).toEqual([removed(1)])
    expect(channel.queued()).toEqual([added])
  })

  it('puts back events whose listeners all left mid-dispatch for the next listener (ADR 0014)', async () => {
    const channel = createNativeQueue()
    mockedGetNativeVoltraAndroid.mockReturnValue(channel.native as unknown as Spec)
    const addVoltraListener = loadAddVoltraListener()
    channel.record(removed(1))
    channel.record(removed(2))
    const first: unknown[] = []

    const subscription = addVoltraListener('widgetRemoved', (event) => {
      first.push(event)
      subscription.remove()
    })
    await flushMicrotasks()
    expect(first).toEqual([removed(1)])
    expect(channel.queued()).toEqual([removed(2)])

    const next: unknown[] = []
    addVoltraListener('widgetRemoved', (event) => next.push(event))
    await flushMicrotasks()
    expect(next).toEqual([removed(2)])
  })

  it('runs the other listeners when one throws (ADR 0014)', async () => {
    const channel = createNativeQueue()
    mockedGetNativeVoltraAndroid.mockReturnValue(channel.native as unknown as Spec)
    const addVoltraListener = loadAddVoltraListener()
    const error = jest.spyOn(console, 'error').mockImplementation(() => {})
    channel.record(removed(1))
    const received: unknown[] = []

    addVoltraListener('widgetRemoved', () => {
      throw new Error('listener bug')
    })
    addVoltraListener('widgetRemoved', (event) => received.push(event))
    await flushMicrotasks()

    expect(received).toEqual([removed(1)])
    expect(error).toHaveBeenCalledTimes(1)
    expect(channel.queued()).toEqual([])
  })

  it('hands listeners subscribed in the same tick the same queued events in one pull', async () => {
    const channel = createNativeQueue()
    mockedGetNativeVoltraAndroid.mockReturnValue(channel.native as unknown as Spec)
    const addVoltraListener = loadAddVoltraListener()
    channel.record(removed(1))
    const first: unknown[] = []
    const second: unknown[] = []

    addVoltraListener('widgetRemoved', (event) => first.push(event))
    addVoltraListener('widgetRemoved', (event) => second.push(event))
    await flushMicrotasks()

    expect(first).toEqual([removed(1)])
    expect(second).toEqual([removed(1)])
    expect(channel.native.popEvents).toHaveBeenCalledTimes(1)
  })

  it('leaves events queued when the listener is removed before the pull', async () => {
    const channel = createNativeQueue()
    mockedGetNativeVoltraAndroid.mockReturnValue(channel.native as unknown as Spec)
    const addVoltraListener = loadAddVoltraListener()
    channel.record(removed(1))
    const listener = jest.fn()

    const subscription = addVoltraListener('widgetRemoved', listener)
    subscription.remove()
    subscription.remove()
    await flushMicrotasks()

    expect(listener).not.toHaveBeenCalled()
    expect(channel.queued()).toEqual([removed(1)])
  })

  it('warns and returns a no-op subscription on a native build without popEvents', () => {
    mockedGetNativeVoltraAndroid.mockReturnValue({} as unknown as Spec)
    const addVoltraListener = loadAddVoltraListener()
    const warn = jest.spyOn(console, 'warn').mockImplementation(() => {})

    const subscription = addVoltraListener('widgetRemoved', () => {})

    expect(warn).toHaveBeenCalledWith(
      "[Voltra] Event 'widgetRemoved' needs a newer native build. Returning no-op subscription."
    )
    expect(() => subscription.remove()).not.toThrow()
  })
})
