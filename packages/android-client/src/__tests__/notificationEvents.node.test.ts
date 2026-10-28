jest.mock('react-native', () => ({
  Platform: { OS: 'android' },
  AppState: { addEventListener: jest.fn(() => ({ remove: jest.fn() })) },
  AppRegistry: { registerHeadlessTask: jest.fn() },
}))

jest.mock('../native/NativeVoltraAndroid.js', () => ({
  getNativeVoltraAndroid: jest.fn(),
}))

import { AppRegistry } from 'react-native'

import type * as Events from '../events.js'
import type * as HeadlessTask from '../headless-task.js'
import { getNativeVoltraAndroid, type Spec } from '../native/NativeVoltraAndroid.js'

const mockedGetNativeVoltraAndroid = jest.mocked(getNativeVoltraAndroid)

type QueuedEvent = { type: string; [key: string]: unknown }

const flushMicrotasks = () => new Promise((resolve) => setImmediate(resolve))

const createNativeQueue = (initial: QueuedEvent[]) => {
  let queue = [...initial]
  return {
    native: {
      popEvents: jest.fn((types: string[]) => {
        const taken = queue.filter((event) => types.includes(event.type))
        queue = queue.filter((event) => !types.includes(event.type))
        return JSON.stringify(taken)
      }),
      restoreEvents: jest.fn((eventsJson: string) => {
        queue = [...(JSON.parse(eventsJson) as QueuedEvent[]), ...queue]
        return true
      }),
      onEventsAvailable: jest.fn(() => ({ remove: jest.fn() })),
    },
    queued: () => queue,
  }
}

const press = {
  type: 'interaction',
  source: 'workout-1',
  timestamp: 1_790_000_000_000,
  identifier: 'pause',
  payload: '',
  notificationId: 'workout-1',
  revision: 7,
}

const load = () => {
  let loaded!: { events: typeof Events; headless: typeof HeadlessTask }
  jest.isolateModules(() => {
    loaded = {
      events: require('../events.js') as typeof Events,
      headless: require('../headless-task.js') as typeof HeadlessTask,
    }
  })
  return loaded
}

describe('ongoing notification event type guards', () => {
  const { events } = load()

  it('accepts the events #316 documents', () => {
    expect(events.isVoltraInteractionEvent(press)).toBe(true)
    expect(events.isVoltraInteractionEvent({ ...press, reply: { key: 'tip', text: '15%', source: 'choice' } })).toBe(
      true
    )
    const dismissed = { type: 'notificationDismissed', source: 'order-123', timestamp: 1, notificationId: 'order-123' }
    expect(events.isVoltraNotificationDismissedEvent(dismissed)).toBe(true)
    expect(events.isVoltraNotificationTappedEvent({ ...dismissed, type: 'notificationTapped' })).toBe(true)
  })

  it('rejects malformed events', () => {
    expect(events.isVoltraInteractionEvent(null)).toBe(false)
    expect(events.isVoltraInteractionEvent({ ...press, revision: '7' })).toBe(false)
    expect(events.isVoltraInteractionEvent({ ...press, reply: { key: 'tip', text: '15%', source: 'other' } })).toBe(
      false
    )
    expect(events.isVoltraInteractionEvent({ ...press, notificationId: undefined })).toBe(false)
    expect(events.isVoltraNotificationDismissedEvent({ ...press, type: 'notificationDismissed', source: 1 })).toBe(
      false
    )
    expect(events.isVoltraNotificationTappedEvent({ ...press, type: 'notificationDismissed' })).toBe(false)
  })
})

describe('Voltra headless task (ADR 0015)', () => {
  afterEach(() => {
    jest.restoreAllMocks()
    mockedGetNativeVoltraAndroid.mockReset()
  })

  it('registers the VoltraEvents task once', () => {
    const { headless } = load()
    const register = jest.mocked(AppRegistry.registerHeadlessTask)
    register.mockClear()

    headless.registerVoltraHeadlessTask()
    headless.registerVoltraHeadlessTask()

    expect(register).toHaveBeenCalledTimes(1)
    expect(register.mock.calls[0]?.[0]).toBe('VoltraEvents')
    expect(register.mock.calls[0]?.[1]()).toBe(headless.runVoltraHeadlessTask)
  })

  it('pulls the queued press and resolves only after an async listener settles', async () => {
    const channel = createNativeQueue([press])
    mockedGetNativeVoltraAndroid.mockReturnValue(channel.native as unknown as Spec)
    const { events, headless } = load()
    let finish!: () => void
    const handled: string[] = []
    events.addVoltraListener('interaction', async (event) => {
      await new Promise<void>((resolve) => {
        finish = resolve
      })
      handled.push(event.identifier)
    })

    let settled = false
    const task = headless.runVoltraHeadlessTask().then(() => {
      settled = true
    })
    await flushMicrotasks()

    expect(channel.queued()).toEqual([])
    expect(settled).toBe(false)
    finish()
    await task
    expect(handled).toEqual(['pause'])
  })

  it('resolves when a listener rejects, and logs it', async () => {
    const channel = createNativeQueue([press])
    mockedGetNativeVoltraAndroid.mockReturnValue(channel.native as unknown as Spec)
    const { events, headless } = load()
    const error = jest.spyOn(console, 'error').mockImplementation(() => {})
    events.addVoltraListener('interaction', async () => {
      throw new Error('boom')
    })

    await headless.runVoltraHeadlessTask()

    expect(error).toHaveBeenCalledWith("[Voltra] A 'interaction' listener rejected:", expect.any(Error))
  })

  it('warns and leaves the press queued without an interaction listener', async () => {
    const channel = createNativeQueue([press])
    mockedGetNativeVoltraAndroid.mockReturnValue(channel.native as unknown as Spec)
    const { headless } = load()
    const warn = jest.spyOn(console, 'warn').mockImplementation(() => {})

    await headless.runVoltraHeadlessTask()

    expect(warn).toHaveBeenCalledTimes(1)
    expect(channel.queued()).toEqual([press])
  })
})
