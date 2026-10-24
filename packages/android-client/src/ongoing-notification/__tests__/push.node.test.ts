import { Platform } from 'react-native'

jest.mock('react-native', () => ({
  Platform: { OS: 'android', Version: 36 },
  PermissionsAndroid: { PERMISSIONS: { POST_NOTIFICATIONS: 'android.permission.POST_NOTIFICATIONS' } },
}))

jest.mock('../../native/NativeVoltraAndroid.js', () => ({
  getNativeVoltraAndroid: jest.fn(),
}))

import { parseAndroidOngoingNotificationPush } from '@use-voltra/android'

import { getNativeVoltraAndroid, type Spec } from '../../native/NativeVoltraAndroid.js'
import { handleAndroidOngoingNotificationPush } from '../push.js'

const mockedGetNativeVoltraAndroid = jest.mocked(getNativeVoltraAndroid)

const payload = { v: 1, kind: 'progress', title: 'Driver is approaching', text: '2 stops away', value: 80, max: 100 }

const upsertEnvelope = {
  v: 1,
  notificationId: 'order-123',
  operation: 'upsert',
  revision: 42,
  options: { channelId: 'delivery_updates', requestPromotedOngoing: true },
  payload,
}

const stopEnvelope = { v: 1, notificationId: 'order-123', operation: 'stop', revision: 43 }

describe('parseAndroidOngoingNotificationPush', () => {
  it.each([
    ['an object at data.voltraOngoingNotification', { voltraOngoingNotification: upsertEnvelope }],
    ['a JSON string at data.voltraOngoingNotification', { voltraOngoingNotification: JSON.stringify(upsertEnvelope) }],
    ['the Expo { data } wrapper', { data: { voltraOngoingNotification: upsertEnvelope } }],
    ['a body JSON string', { body: JSON.stringify({ voltraOngoingNotification: upsertEnvelope }) }],
    ['a dataString JSON string', { dataString: JSON.stringify({ voltraOngoingNotification: upsertEnvelope }) }],
  ])('accepts %s', (_shape, data) => {
    const result = parseAndroidOngoingNotificationPush(data)

    expect(result).toEqual({ ok: true, envelope: upsertEnvelope })
  })

  it.each([
    ['undefined', undefined],
    ['an unrelated push', { title: 'Hello' }],
    ['a body that is not JSON', { body: 'not json' }],
  ])('returns no_envelope for %s', (_shape, data) => {
    expect(parseAndroidOngoingNotificationPush(data)).toEqual({ ok: false, reason: 'no_envelope', issues: [] })
  })

  it('treats a missing v as version 1', () => {
    const { v: _v, ...withoutVersion } = upsertEnvelope
    const result = parseAndroidOngoingNotificationPush({ voltraOngoingNotification: withoutVersion })

    expect(result.ok && result.envelope.v).toBe(1)
  })

  it('rejects an unknown version', () => {
    const result = parseAndroidOngoingNotificationPush({ voltraOngoingNotification: { ...upsertEnvelope, v: 2 } })

    expect(result).toMatchObject({ ok: false, reason: 'unsupported_version' })
  })

  it('reports one issue per violation', () => {
    const result = parseAndroidOngoingNotificationPush({
      voltraOngoingNotification: { notificationId: 7, operation: 'restart', revision: -1 },
    })

    expect(result).toEqual({
      ok: false,
      reason: 'invalid_envelope',
      issues: [
        'notificationId must be a non-empty string',
        "operation must be 'upsert' or 'stop'",
        'revision must be a non-negative integer',
      ],
    })
  })

  it('requires an object payload for upsert', () => {
    const { payload: _payload, ...withoutPayload } = upsertEnvelope
    const result = parseAndroidOngoingNotificationPush({ voltraOngoingNotification: withoutPayload })

    expect(result).toEqual({
      ok: false,
      reason: 'invalid_envelope',
      issues: ['payload must be an object (or a JSON object string) for upsert'],
    })
  })

  it('rejects a revision that is not an integer', () => {
    const result = parseAndroidOngoingNotificationPush({
      voltraOngoingNotification: { ...stopEnvelope, revision: 1.5 },
    })

    expect(result).toMatchObject({ ok: false, issues: ['revision must be a non-negative integer'] })
  })

  it('accepts a stop without a payload', () => {
    expect(parseAndroidOngoingNotificationPush({ voltraOngoingNotification: stopEnvelope })).toEqual({
      ok: true,
      envelope: stopEnvelope,
    })
  })
})

describe('handleAndroidOngoingNotificationPush', () => {
  const nativeUpsert = jest.fn()
  const nativeStop = jest.fn()

  beforeEach(() => {
    jest.clearAllMocks()
    ;(Platform as { OS: string }).OS = 'android'
    nativeUpsert.mockResolvedValue({ ok: true, notificationId: 'order-123', action: 'started' })
    nativeStop.mockResolvedValue({ ok: true, notificationId: 'order-123', action: 'stopped' })
    mockedGetNativeVoltraAndroid.mockReturnValue({
      upsertAndroidOngoingNotification: nativeUpsert,
      stopAndroidOngoingNotification: nativeStop,
    } as unknown as Spec)
  })

  it('ensures the channel once, then upserts with the envelope options over the defaults', async () => {
    const ensureChannel = jest.fn()

    const result = await handleAndroidOngoingNotificationPush(
      { voltraOngoingNotification: upsertEnvelope },
      { defaults: { channelId: 'fallback', smallIcon: 'ic_delivery' }, ensureChannel }
    )

    expect(ensureChannel).toHaveBeenCalledTimes(1)
    expect(ensureChannel).toHaveBeenCalledWith('delivery_updates')
    expect(nativeUpsert).toHaveBeenCalledTimes(1)
    expect(nativeUpsert).toHaveBeenCalledWith(
      JSON.stringify(payload),
      expect.objectContaining({
        channelId: 'delivery_updates',
        smallIcon: 'ic_delivery',
        requestPromotedOngoing: true,
        notificationId: 'order-123',
        revision: 42,
      })
    )
    expect(result).toEqual({
      handled: true,
      operation: 'upsert',
      notificationId: 'order-123',
      result: { ok: true, notificationId: 'order-123', action: 'started' },
    })
  })

  it('stops with the revision and never ensures a channel', async () => {
    const ensureChannel = jest.fn()

    const result = await handleAndroidOngoingNotificationPush(
      { voltraOngoingNotification: stopEnvelope },
      { ensureChannel }
    )

    expect(nativeStop).toHaveBeenCalledTimes(1)
    expect(nativeStop).toHaveBeenCalledWith('order-123', { revision: 43 })
    expect(ensureChannel).not.toHaveBeenCalled()
    expect(result).toMatchObject({ handled: true, operation: 'stop', result: { ok: true } })
  })

  it('returns a native rejection instead of throwing', async () => {
    nativeUpsert.mockRejectedValue(new Error('Notification channel does not exist'))

    const result = await handleAndroidOngoingNotificationPush({ voltraOngoingNotification: upsertEnvelope })

    expect(result).toEqual({
      handled: true,
      operation: 'upsert',
      notificationId: 'order-123',
      result: { ok: false, reason: 'native_error', message: 'Notification channel does not exist' },
    })
  })

  it('returns a failing ensureChannel as a native error too', async () => {
    const result = await handleAndroidOngoingNotificationPush(
      { voltraOngoingNotification: upsertEnvelope },
      {
        ensureChannel: () => {
          throw new Error('no channel')
        },
      }
    )

    expect(result).toMatchObject({
      handled: true,
      result: { ok: false, reason: 'native_error', message: 'no channel' },
    })
    expect(nativeUpsert).not.toHaveBeenCalled()
  })

  it('reports a malformed push without calling native code', async () => {
    const result = await handleAndroidOngoingNotificationPush({ voltraOngoingNotification: { notificationId: '' } })

    expect(result).toMatchObject({ handled: false, reason: 'invalid_envelope' })
    expect(mockedGetNativeVoltraAndroid).not.toHaveBeenCalled()
  })

  it('does nothing off Android', async () => {
    ;(Platform as { OS: string }).OS = 'ios'

    const result = await handleAndroidOngoingNotificationPush({ voltraOngoingNotification: upsertEnvelope })

    expect(result).toEqual({ handled: false, reason: 'unsupported_platform' })
    expect(mockedGetNativeVoltraAndroid).not.toHaveBeenCalled()
  })
})
