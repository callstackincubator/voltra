jest.mock('react-native', () => ({
  Platform: { OS: 'android', Version: 31 },
  PermissionsAndroid: { PERMISSIONS: { POST_NOTIFICATIONS: 'android.permission.POST_NOTIFICATIONS' } },
}))

jest.mock('../native/NativeVoltraAndroid.js', () => ({
  getNativeVoltraAndroid: jest.fn(),
}))

import { getNativeVoltraAndroid, type Spec } from '../native/NativeVoltraAndroid.js'
import { getAndroidOngoingNotificationCapabilities } from '../ongoing-notification/api.js'

const mockedGetNativeVoltraAndroid = jest.mocked(getNativeVoltraAndroid)

const baseCapabilities = {
  apiLevel: 31,
  notificationsEnabled: true,
  supportsPromotedNotifications: false,
  canPostPromotedNotifications: false,
  canRequestPromotedOngoing: false,
}

describe('getAndroidOngoingNotificationCapabilities', () => {
  it('passes the action flags the native module reports', () => {
    mockedGetNativeVoltraAndroid.mockReturnValue({
      getAndroidOngoingNotificationCapabilities: () => ({
        ...baseCapabilities,
        supportsAuthenticationRequiredActions: true,
        supportsSemanticActions: true,
      }),
    } as unknown as Spec)

    expect(getAndroidOngoingNotificationCapabilities()).toEqual({
      ...baseCapabilities,
      supportsAuthenticationRequiredActions: true,
      supportsSemanticActions: true,
    })
  })

  it('reports both action flags as false for a native build that predates them', () => {
    mockedGetNativeVoltraAndroid.mockReturnValue({
      getAndroidOngoingNotificationCapabilities: () => baseCapabilities,
    } as unknown as Spec)

    expect(getAndroidOngoingNotificationCapabilities()).toEqual({
      ...baseCapabilities,
      supportsAuthenticationRequiredActions: false,
      supportsSemanticActions: false,
    })
  })
})
