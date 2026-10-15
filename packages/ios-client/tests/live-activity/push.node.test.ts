import { Platform } from 'react-native'

import {
  areLiveActivitiesEnabled,
  getLiveActivityPushTokens,
  getLiveActivityPushToStartToken,
} from '../../src/live-activity/push.js'
import { getNativeVoltra, type Spec } from '../../src/VoltraModule.js'

jest.mock('react-native', () => ({ Platform: { OS: 'ios' } }))
jest.mock('../../src/VoltraModule.js', () => ({ getNativeVoltra: jest.fn() }))

const mockedGetNativeVoltra = jest.mocked(getNativeVoltra)
const mockedPlatform = Platform as { OS: string }

describe('Live Activity push state getters', () => {
  afterEach(() => {
    mockedPlatform.OS = 'ios'
    jest.clearAllMocks()
    jest.restoreAllMocks()
  })

  it('returns the push tokens native reports, keyed by activity name', async () => {
    const getLiveActivityPushTokens = jest.fn().mockResolvedValue([
      { activityName: 'order-123', pushToken: 'aa11' },
      { activityName: 'dynamic-ride', pushToken: 'bb22' },
    ])
    mockedGetNativeVoltra.mockReturnValue({ getLiveActivityPushTokens } as unknown as Spec)

    await expect(getLiveActivityPushTokens()).resolves.toEqual([
      { activityName: 'order-123', pushToken: 'aa11' },
      { activityName: 'dynamic-ride', pushToken: 'bb22' },
    ])
    expect(getLiveActivityPushTokens).toHaveBeenCalledTimes(1)
  })

  it('returns an empty list when native has no tokens', async () => {
    mockedGetNativeVoltra.mockReturnValue({
      getLiveActivityPushTokens: jest.fn().mockResolvedValue([]),
    } as unknown as Spec)

    await expect(getLiveActivityPushTokens()).resolves.toEqual([])
  })

  it('returns the push-to-start token, or null before one is issued', async () => {
    const getLiveActivityPushToStartToken = jest.fn().mockResolvedValueOnce('cc33').mockResolvedValueOnce(null)
    mockedGetNativeVoltra.mockReturnValue({ getLiveActivityPushToStartToken } as unknown as Spec)

    await expect(getLiveActivityPushToStartToken()).resolves.toBe('cc33')
    await expect(getLiveActivityPushToStartToken()).resolves.toBeNull()
  })

  it('reads enablement synchronously', () => {
    const areLiveActivitiesEnabledNative = jest.fn().mockReturnValueOnce(true).mockReturnValueOnce(false)
    mockedGetNativeVoltra.mockReturnValue({
      areLiveActivitiesEnabled: areLiveActivitiesEnabledNative,
    } as unknown as Spec)

    expect(areLiveActivitiesEnabled()).toBe(true)
    expect(areLiveActivitiesEnabled()).toBe(false)
  })

  it('returns empty values without touching the native module off iOS', async () => {
    mockedPlatform.OS = 'android'
    jest.spyOn(console, 'error').mockImplementation(() => {})

    await expect(getLiveActivityPushTokens()).resolves.toEqual([])
    await expect(getLiveActivityPushToStartToken()).resolves.toBeNull()
    expect(areLiveActivitiesEnabled()).toBe(false)
    expect(mockedGetNativeVoltra).not.toHaveBeenCalled()
  })
})
