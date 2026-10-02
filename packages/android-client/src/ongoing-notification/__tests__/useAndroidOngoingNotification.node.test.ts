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
