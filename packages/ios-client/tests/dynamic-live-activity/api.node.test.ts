import { Platform } from 'react-native'
import * as React from 'react'

const ReactTestRenderer = require('react-test-renderer') as {
  act: (callback: () => void | Promise<void>) => Promise<void>
  create: (element: React.ReactElement) => { update: (element: React.ReactElement) => void; unmount: () => void }
}

import { getNativeVoltra, type Spec } from '../../src/VoltraModule.js'
import {
  getDynamicLiveActivityDefinitionIds,
  startDynamicLiveActivity,
  updateDynamicLiveActivity,
} from '../../src/live-activity/dynamic-api.js'

jest.mock('react-native', () => ({
  Platform: { OS: 'ios' },
}))

jest.mock('../../src/VoltraModule.js', () => ({ getNativeVoltra: jest.fn() }))

const mockedGetNativeVoltra = jest.mocked(getNativeVoltra)
const mockedPlatform = Platform as { OS: string }

describe('Dynamic Live Activity client APIs', () => {
  afterEach(() => {
    mockedPlatform.OS = 'ios'
    jest.clearAllMocks()
    jest.restoreAllMocks()
  })

  it('serializes complete props and routes dynamic starts without using the legacy renderer', async () => {
    const startDynamicLiveActivityNative = jest
      .fn<Promise<string>, [string, string, object]>()
      .mockResolvedValue('order-123')
    const startLiveActivity = jest.fn()
    mockedGetNativeVoltra.mockReturnValue({
      startDynamicLiveActivity: startDynamicLiveActivityNative,
      startLiveActivity,
    } as unknown as Spec)

    await expect(
      startDynamicLiveActivity(
        'order_finished',
        { status: 'delivering', stops: [{ id: 1, complete: false }] },
        { activityName: 'order-123', deepLinkUrl: 'myapp://orders/123', channelId: 'orders', relevanceScore: 0.9 }
      )
    ).resolves.toBe('order-123')

    expect(startDynamicLiveActivityNative).toHaveBeenCalledWith(
      'order_finished',
      '{"status":"delivering","stops":[{"id":1,"complete":false}]}',
      {
        target: 'liveActivity',
        activityName: 'order-123',
        deepLinkUrl: 'myapp://orders/123',
        channelId: 'orders',
        relevanceScore: 0.9,
      }
    )
    expect(startLiveActivity).not.toHaveBeenCalled()
  })

  it('replaces complete props and normalizes update metadata through the dynamic native method', async () => {
    const updateDynamicLiveActivityNative = jest
      .fn<Promise<void>, [string, string, object]>()
      .mockResolvedValue(undefined)
    const updateLiveActivity = jest.fn()
    mockedGetNativeVoltra.mockReturnValue({
      updateDynamicLiveActivity: updateDynamicLiveActivityNative,
      updateLiveActivity,
    } as unknown as Spec)

    await updateDynamicLiveActivity(
      'order-123',
      { status: 'delivered' },
      { staleDate: Date.now() - 1, relevanceScore: 2 }
    )

    expect(updateDynamicLiveActivityNative).toHaveBeenCalledWith('order-123', '{"status":"delivered"}', {
      relevanceScore: 0,
    })
    expect(updateLiveActivity).not.toHaveBeenCalled()
  })

  it.each([
    [{ value: undefined }, 'unsupported type undefined'],
    [{ value: Number.NaN }, 'not a finite number'],
    [{ value: new Date() }, 'must be a plain object'],
  ])('rejects non-JSON-compatible props with a clear error: %o', async (props, message) => {
    await expect(startDynamicLiveActivity('order_finished', props as never)).rejects.toThrow(message)
    expect(mockedGetNativeVoltra).not.toHaveBeenCalled()
  })

  it('rejects circular props before calling native', async () => {
    const props: { self?: unknown } = {}
    props.self = props

    await expect(startDynamicLiveActivity('order_finished', props as never)).rejects.toThrow('circular reference')
    expect(mockedGetNativeVoltra).not.toHaveBeenCalled()
  })

  it('returns the installed native definition catalog', async () => {
    const nativeGetDefinitionIds = jest.fn<Promise<string[]>, []>().mockResolvedValue(['delivery', 'order_finished'])
    mockedGetNativeVoltra.mockReturnValue({
      getDynamicLiveActivityDefinitionIds: nativeGetDefinitionIds,
    } as unknown as Spec)

    await expect(getDynamicLiveActivityDefinitionIds()).resolves.toEqual(['delivery', 'order_finished'])
  })

  it('uses iOS no-op behavior on other platforms', async () => {
    mockedPlatform.OS = 'android'
    const consoleError = jest.spyOn(console, 'error').mockImplementation(() => undefined)

    await expect(startDynamicLiveActivity('order_finished', { status: 'pending' })).resolves.toBe('')
    await expect(updateDynamicLiveActivity('order-123', { status: 'pending' })).resolves.toBeUndefined()
    await expect(getDynamicLiveActivityDefinitionIds()).resolves.toEqual([])

    expect(mockedGetNativeVoltra).not.toHaveBeenCalled()
    expect(consoleError).toHaveBeenCalledTimes(3)
  })

  it('auto-starts and auto-updates the complete current props through the dynamic engine', async () => {
    const startDynamicLiveActivityNative = jest
      .fn<Promise<string>, [string, string, object]>()
      .mockResolvedValue('order-123')
    const updateDynamicLiveActivityNative = jest
      .fn<Promise<void>, [string, string, object]>()
      .mockResolvedValue(undefined)
    const isLiveActivityActive = jest.fn().mockReturnValue(false)
    mockedGetNativeVoltra.mockReturnValue({
      startDynamicLiveActivity: startDynamicLiveActivityNative,
      updateDynamicLiveActivity: updateDynamicLiveActivityNative,
      isLiveActivityActive,
      onStateChanged: jest.fn(() => ({ remove: jest.fn() })),
    } as unknown as Spec)

    function Activity({ status }: { status: string }): null {
      // This component deliberately exists only to exercise the public hook.
      require('../../src/live-activity/dynamic-api.js').useDynamicLiveActivity(
        'order_finished',
        { status },
        {
          activityName: 'order-123',
          autoStart: true,
          autoUpdate: true,
        }
      )
      return null
    }

    let renderer: ReturnType<typeof ReactTestRenderer.create>
    await ReactTestRenderer.act(async () => {
      renderer = ReactTestRenderer.create(React.createElement(Activity, { status: 'pending' }))
    })
    await ReactTestRenderer.act(async () => {
      renderer!.update(React.createElement(Activity, { status: 'delivered' }))
    })

    expect(startDynamicLiveActivityNative).toHaveBeenCalledWith(
      'order_finished',
      '{"status":"pending"}',
      expect.objectContaining({ activityName: 'order-123' })
    )
    expect(updateDynamicLiveActivityNative).toHaveBeenLastCalledWith('order-123', '{"status":"delivered"}', {
      relevanceScore: 0,
    })

    await ReactTestRenderer.act(async () => renderer!.unmount())
  })
})
