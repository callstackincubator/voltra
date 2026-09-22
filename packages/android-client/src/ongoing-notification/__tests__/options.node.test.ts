import {
  getFilteredAndroidOngoingNotificationUpdateOptions,
  getStartAndroidOngoingNotificationOptions,
  getUpsertAndroidOngoingNotificationOptions,
} from '../options.js'

/**
 * Hands a validator an option value the public types forbid, which is exactly the point: these tests
 * check the runtime guard that has to catch what a hand-written push or a plain JS caller can send.
 */
const invalid = (options: Record<string, unknown>) => options as never

const startOptions = {
  notificationId: 'ride-44',
  channelId: 'ride_updates',
}

describe('getStartAndroidOngoingNotificationOptions', () => {
  it('forwards every presentation option to the bridge', () => {
    const options = {
      ...startOptions,
      visibility: 'private',
      color: '#1E88E5',
      category: 'navigation',
      timeoutMs: 1800000,
      localOnly: true,
      group: 'rides',
      sortKey: '2026-09-22T12:00',
      allowSystemGeneratedContextualActions: false,
    } as const

    expect(getStartAndroidOngoingNotificationOptions(options)).toEqual(options)
  })

  it('leaves out presentation options the caller did not set', () => {
    const options = getStartAndroidOngoingNotificationOptions(startOptions)

    for (const optionName of ['visibility', 'color', 'category', 'timeoutMs', 'localOnly', 'group', 'sortKey']) {
      expect(optionName in options).toBe(false)
    }
    expect(options.channelId).toBe('ride_updates')
  })

  it('rejects a value outside the visibility union', () => {
    expect(() =>
      getStartAndroidOngoingNotificationOptions(invalid({ ...startOptions, visibility: 'everyone' }))
    ).toThrow(
      /^\[Voltra\] \[Android\] Ongoing notification option "visibility" must be one of "public", "private", "secret"\./
    )
  })

  it('rejects a category outside the supported set, including the payload kind name', () => {
    expect(() => getStartAndroidOngoingNotificationOptions(invalid({ ...startOptions, category: 'bigText' }))).toThrow(
      /option "category" must be one of/
    )
    expect(() => getStartAndroidOngoingNotificationOptions(invalid({ ...startOptions, category: 'call' }))).toThrow(
      /option "category" must be one of/
    )
  })

  it('rejects a timeout that is not a positive whole number of milliseconds', () => {
    for (const timeoutMs of [0, -1, 1.5, Number.NaN, Number.POSITIVE_INFINITY, '1800000']) {
      expect(() => getStartAndroidOngoingNotificationOptions(invalid({ ...startOptions, timeoutMs }))).toThrow(
        /option "timeoutMs" must be a positive integer number of milliseconds/
      )
    }
  })

  it('rejects empty strings and non-booleans', () => {
    expect(() => getStartAndroidOngoingNotificationOptions({ ...startOptions, color: '' })).toThrow(
      /option "color" must be a non-empty string/
    )
    expect(() => getStartAndroidOngoingNotificationOptions({ ...startOptions, group: '' })).toThrow(
      /option "group" must be a non-empty string/
    )
    expect(() => getStartAndroidOngoingNotificationOptions(invalid({ ...startOptions, sortKey: 12 }))).toThrow(
      /option "sortKey" must be a non-empty string/
    )
    expect(() => getStartAndroidOngoingNotificationOptions(invalid({ ...startOptions, localOnly: 'true' }))).toThrow(
      /option "localOnly" must be a boolean/
    )
    expect(() =>
      getStartAndroidOngoingNotificationOptions(
        invalid({
          ...startOptions,
          allowSystemGeneratedContextualActions: 'no',
        })
      )
    ).toThrow(/option "allowSystemGeneratedContextualActions" must be a boolean/)
  })

  it('rejects the per-post alert option on start', () => {
    expect(() => getStartAndroidOngoingNotificationOptions(invalid({ ...startOptions, alert: true }))).toThrow(
      /option "alert" is only available when updating/
    )
  })
})

describe('getFilteredAndroidOngoingNotificationUpdateOptions', () => {
  it('returns undefined when there is nothing to change', () => {
    expect(getFilteredAndroidOngoingNotificationUpdateOptions()).toBeUndefined()
    expect(getFilteredAndroidOngoingNotificationUpdateOptions({})).toBeUndefined()
  })

  it('forwards the pre-existing options unchanged', () => {
    expect(
      getFilteredAndroidOngoingNotificationUpdateOptions({
        channelId: 'ride_updates',
        smallIcon: 'ic_ride',
        deepLinkUrl: 'myapp://rides/44',
        requestPromotedOngoing: true,
        fallbackBehavior: 'error',
      })
    ).toEqual({
      channelId: 'ride_updates',
      smallIcon: 'ic_ride',
      deepLinkUrl: 'myapp://rides/44',
      requestPromotedOngoing: true,
      fallbackBehavior: 'error',
    })
  })

  it('keeps the three states of a presentation option', () => {
    const filtered = getFilteredAndroidOngoingNotificationUpdateOptions({
      color: '#000000',
      group: null,
      timeoutMs: 60000,
    })

    // Replaced, cleared, and untouched: the native merge treats these three differently, so a key
    // that was absent must stay absent rather than be forwarded as undefined.
    expect(filtered).toEqual({ color: '#000000', group: null, timeoutMs: 60000 })
    expect('visibility' in filtered!).toBe(false)
    expect('sortKey' in filtered!).toBe(false)
  })

  it('forwards alert as a per-post option', () => {
    expect(getFilteredAndroidOngoingNotificationUpdateOptions({ alert: true })).toEqual({ alert: true })
    expect(getFilteredAndroidOngoingNotificationUpdateOptions({ alert: false })).toEqual({ alert: false })
  })

  it('rejects a malformed alert or presentation option before the native call', () => {
    expect(() => getFilteredAndroidOngoingNotificationUpdateOptions(invalid({ alert: 'yes' }))).toThrow(
      /option "alert" must be a boolean/
    )
    expect(() => getFilteredAndroidOngoingNotificationUpdateOptions(invalid({ visibility: 'everyone' }))).toThrow(
      /option "visibility" must be one of/
    )
    expect(() => getFilteredAndroidOngoingNotificationUpdateOptions({ timeoutMs: 0 })).toThrow(
      /option "timeoutMs" must be a positive integer number of milliseconds/
    )
  })
})

describe('getUpsertAndroidOngoingNotificationOptions', () => {
  it('accepts what only an update can use, because an upsert may update', () => {
    expect(
      getUpsertAndroidOngoingNotificationOptions({
        ...startOptions,
        alert: true,
        color: null,
        timeoutMs: 60000,
      })
    ).toEqual({ ...startOptions, alert: true, color: null, timeoutMs: 60000 })
  })

  it('still validates the values it forwards', () => {
    expect(() => getUpsertAndroidOngoingNotificationOptions(invalid({ ...startOptions, alert: 'yes' }))).toThrow(
      /option "alert" must be a boolean/
    )
    expect(() =>
      getUpsertAndroidOngoingNotificationOptions(invalid({ ...startOptions, visibility: 'everyone' }))
    ).toThrow(/option "visibility" must be one of/)
  })

  it('leaves out the keys the caller did not set', () => {
    const options = getUpsertAndroidOngoingNotificationOptions(startOptions)

    expect('alert' in options).toBe(false)
    expect('color' in options).toBe(false)
  })
})
