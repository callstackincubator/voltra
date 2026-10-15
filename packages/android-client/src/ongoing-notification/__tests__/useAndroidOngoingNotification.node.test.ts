import * as React from 'react'

const ReactTestRenderer = require('react-test-renderer') as {
  act: (callback: () => void | Promise<void>) => Promise<void>
  create: (element: React.ReactElement) => {
    update: (element: React.ReactElement) => void
    unmount: () => void
  }
}

jest.mock('react-native', () => ({
  Platform: { OS: 'android', Version: 36 },
  PermissionsAndroid: { PERMISSIONS: { POST_NOTIFICATIONS: 'android.permission.POST_NOTIFICATIONS' } },
}))

jest.mock('../../native/NativeVoltraAndroid.js', () => ({
  getNativeVoltraAndroid: jest.fn(),
}))

// The hook reads `__DEV__` through `useUpdateOnHMR`, and react-test-renderer needs act enabled.
;(globalThis as { __DEV__?: boolean }).__DEV__ = false
;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

import { getNativeVoltraAndroid, type Spec } from '../../native/NativeVoltraAndroid.js'

import { useAndroidOngoingNotification } from '../api.js'

const mockedGetNativeVoltraAndroid = jest.mocked(getNativeVoltraAndroid)

type OngoingNotificationApi = ReturnType<typeof useAndroidOngoingNotification>

let content = 'Driver is on the way'
let apiRef: { current: OngoingNotificationApi | null }

function HookProbe() {
  apiRef.current = useAndroidOngoingNotification(content, {
    notificationId: 'ride-44',
    channelId: 'rides',
    autoUpdate: true,
  })
  return null
}

describe('useAndroidOngoingNotification', () => {
  let nativeUpdate: jest.Mock

  beforeEach(() => {
    content = 'Driver is on the way'
    apiRef = { current: null }
    nativeUpdate = jest.fn().mockResolvedValue({ ok: true, notificationId: 'ride-44', action: 'updated' })
    mockedGetNativeVoltraAndroid.mockReturnValue({
      isAndroidOngoingNotificationActive: jest.fn().mockReturnValue(true),
      updateAndroidOngoingNotification: nativeUpdate,
      onOngoingNotificationEnded: jest.fn().mockReturnValue({ remove: jest.fn() }),
    } as unknown as Spec)
  })

  it('replays autoUpdate updates without the alert of the last explicit update', async () => {
    let tree!: ReturnType<typeof ReactTestRenderer.create>
    await ReactTestRenderer.act(async () => {
      tree = ReactTestRenderer.create(React.createElement(HookProbe))
    })

    // autoUpdate posts once as soon as the hook takes over an active notification.
    expect(nativeUpdate).toHaveBeenCalledTimes(1)

    await ReactTestRenderer.act(async () => {
      await apiRef.current!.update({ alert: true, color: '#1E88E5' })
    })
    expect(nativeUpdate).toHaveBeenCalledTimes(2)
    expect(nativeUpdate.mock.calls[1][2]).toMatchObject({ alert: true, color: '#1E88E5' })

    content = 'Driver is outside'
    await ReactTestRenderer.act(async () => {
      tree.update(React.createElement(HookProbe))
    })

    expect(nativeUpdate).toHaveBeenCalledTimes(3)
    const replayedOptions = nativeUpdate.mock.calls[2][2]
    expect(replayedOptions).not.toHaveProperty('alert')
    expect(replayedOptions).toMatchObject({ color: '#1E88E5' })
  })
})

describe('useAndroidOngoingNotification lifecycle', () => {
  type EndedEvent = { notificationId: string; reason: string }

  let probeOptions: { autoStart?: boolean; autoUpdate?: boolean }
  let isActiveOnDevice: jest.Mock
  let nativeStart: jest.Mock
  let nativeStop: jest.Mock
  let removeSubscription: jest.Mock
  let endedListeners: ((event: EndedEvent) => void)[]

  function LifecycleProbe() {
    apiRef.current = useAndroidOngoingNotification('Driver is on the way', {
      notificationId: 'ride-44',
      channelId: 'rides',
      ...probeOptions,
    })
    return null
  }

  const mount = async () => {
    let tree!: ReturnType<typeof ReactTestRenderer.create>
    await ReactTestRenderer.act(async () => {
      tree = ReactTestRenderer.create(React.createElement(LifecycleProbe))
    })
    return tree
  }

  const emitEnded = async (event: EndedEvent) => {
    await ReactTestRenderer.act(async () => {
      endedListeners.forEach((listener) => listener(event))
    })
  }

  beforeEach(() => {
    apiRef = { current: null }
    probeOptions = {}
    endedListeners = []
    isActiveOnDevice = jest.fn().mockReturnValue(true)
    nativeStart = jest.fn().mockResolvedValue({ ok: true, notificationId: 'ride-44', action: 'started' })
    nativeStop = jest.fn().mockResolvedValue({ ok: true, notificationId: 'ride-44', action: 'stopped' })
    removeSubscription = jest.fn()
    mockedGetNativeVoltraAndroid.mockReturnValue({
      isAndroidOngoingNotificationActive: isActiveOnDevice,
      startAndroidOngoingNotification: nativeStart,
      stopAndroidOngoingNotification: nativeStop,
      updateAndroidOngoingNotification: jest.fn().mockResolvedValue({ ok: true, notificationId: 'ride-44' }),
      onOngoingNotificationEnded: jest.fn((listener: (event: EndedEvent) => void) => {
        endedListeners.push(listener)
        return { remove: removeSubscription }
      }),
    } as unknown as Spec)
  })

  it('turns inactive when the device reports its notification dismissed', async () => {
    await mount()
    expect(apiRef.current!.isActive).toBe(true)

    await emitEnded({ notificationId: 'another-ride', reason: 'dismissed' })
    expect(apiRef.current!.isActive).toBe(true)

    await emitEnded({ notificationId: 'ride-44', reason: 'dismissed' })
    expect(apiRef.current!.isActive).toBe(false)
  })

  it('turns inactive when its notification is stopped by other code', async () => {
    await mount()

    await emitEnded({ notificationId: 'ride-44', reason: 'stopped' })

    expect(apiRef.current!.isActive).toBe(false)
  })

  it('reads the device again after subscribing, so a dismissal before the subscription is not lost', async () => {
    // Active for the first render, dismissed by the time the subscription exists.
    isActiveOnDevice.mockReturnValueOnce(true).mockReturnValue(false)

    await mount()

    expect(apiRef.current!.isActive).toBe(false)
  })

  it('starts again after a dismissal', async () => {
    await mount()
    await emitEnded({ notificationId: 'ride-44', reason: 'dismissed' })

    await ReactTestRenderer.act(async () => {
      await apiRef.current!.start()
    })

    expect(nativeStart).toHaveBeenCalledTimes(1)
    expect(apiRef.current!.isActive).toBe(true)
  })

  it('auto-starts once on mount and not again after a dismissal or end()', async () => {
    isActiveOnDevice.mockReturnValue(false)
    probeOptions = { autoStart: true }

    await mount()
    expect(nativeStart).toHaveBeenCalledTimes(1)
    expect(apiRef.current!.isActive).toBe(true)

    await emitEnded({ notificationId: 'ride-44', reason: 'dismissed' })
    expect(apiRef.current!.isActive).toBe(false)
    expect(nativeStart).toHaveBeenCalledTimes(1)

    await ReactTestRenderer.act(async () => {
      await apiRef.current!.start()
    })
    await ReactTestRenderer.act(async () => {
      await apiRef.current!.end()
    })
    expect(nativeStop).toHaveBeenCalledTimes(1)
    expect(apiRef.current!.isActive).toBe(false)
    expect(nativeStart).toHaveBeenCalledTimes(2)
  })

  it('does not auto-start over a notification that is already active', async () => {
    probeOptions = { autoStart: true }

    await mount()

    expect(nativeStart).not.toHaveBeenCalled()
    expect(apiRef.current!.isActive).toBe(true)
  })

  it('auto-starts when autoStart turns on after mount', async () => {
    isActiveOnDevice.mockReturnValue(false)
    const tree = await mount()
    expect(nativeStart).not.toHaveBeenCalled()

    probeOptions = { autoStart: true }
    await ReactTestRenderer.act(async () => {
      tree.update(React.createElement(LifecycleProbe))
    })

    expect(nativeStart).toHaveBeenCalledTimes(1)
    expect(apiRef.current!.isActive).toBe(true)
  })

  it('follows a generated notification id', async () => {
    isActiveOnDevice.mockReturnValue(false)
    nativeStart.mockResolvedValue({ ok: true, notificationId: 'generated-1', action: 'started' })

    function GeneratedIdProbe() {
      apiRef.current = useAndroidOngoingNotification('Driver is on the way', { channelId: 'rides' })
      return null
    }
    await ReactTestRenderer.act(async () => {
      ReactTestRenderer.create(React.createElement(GeneratedIdProbe))
    })
    await ReactTestRenderer.act(async () => {
      await apiRef.current!.start()
    })
    expect(apiRef.current!.isActive).toBe(true)

    await emitEnded({ notificationId: 'generated-1', reason: 'dismissed' })

    expect(apiRef.current!.isActive).toBe(false)
  })

  it('keeps working without the native ended event', async () => {
    mockedGetNativeVoltraAndroid.mockReturnValue({
      isAndroidOngoingNotificationActive: isActiveOnDevice,
      startAndroidOngoingNotification: nativeStart,
    } as unknown as Spec)

    await mount()

    expect(apiRef.current!.isActive).toBe(true)
  })

  it('unsubscribes on unmount', async () => {
    const tree = await mount()

    await ReactTestRenderer.act(async () => {
      tree.unmount()
    })

    expect(removeSubscription).toHaveBeenCalledTimes(1)
  })
})
