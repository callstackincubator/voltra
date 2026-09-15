import {
  DYNAMIC_WIDGET_SERVER_UPDATE_INTERVAL_MINUTES,
  resolveServerUpdateInterval,
  resolveServerUpdateUrl,
  validateServerUpdateRefresh,
} from './serverUpdate'

const PAYLOAD_WIDGET = {
  context: 'android.widgets[portfolio].serverUpdate',
  hasEntry: false,
  defaultIntervalMinutes: 60,
  minimumIntervalMinutes: 15,
}

const DYNAMIC_WIDGET = { ...PAYLOAD_WIDGET, hasEntry: true }

describe('resolveServerUpdateInterval', () => {
  it('falls back to the platform default for a payload widget that sets no interval', () => {
    expect(resolveServerUpdateInterval({ ...PAYLOAD_WIDGET, intervalMinutes: undefined })).toEqual({
      kind: 'ok',
      intervalMinutes: 60,
    })
  })

  it('falls back to 15 for a widget with an entry, ignoring the platform default', () => {
    expect(resolveServerUpdateInterval({ ...DYNAMIC_WIDGET, intervalMinutes: undefined })).toEqual({
      kind: 'ok',
      intervalMinutes: DYNAMIC_WIDGET_SERVER_UPDATE_INTERVAL_MINUTES,
    })
  })

  it('keeps the payload widget rule and rejects an interval below the platform floor', () => {
    const resolution = resolveServerUpdateInterval({ ...PAYLOAD_WIDGET, intervalMinutes: 5 })

    expect(resolution.kind).toBe('invalid')
    expect(resolution).toHaveProperty('error', expect.stringContaining('at least 15'))
  })

  it('accepts an interval below 15 on iOS payload widgets, where the floor is 1', () => {
    expect(
      resolveServerUpdateInterval({
        ...PAYLOAD_WIDGET,
        context: 'ios.widgets[portfolio].serverUpdate',
        defaultIntervalMinutes: 15,
        minimumIntervalMinutes: 1,
        intervalMinutes: 5,
      })
    ).toEqual({ kind: 'ok', intervalMinutes: 5 })
  })

  it('clamps a widget with an entry up to 15 and warns instead of failing the build', () => {
    const resolution = resolveServerUpdateInterval({
      ...DYNAMIC_WIDGET,
      minimumIntervalMinutes: 1,
      intervalMinutes: 5,
    })

    expect(resolution).toEqual({
      kind: 'clamped',
      intervalMinutes: 15,
      warning: expect.stringContaining('below the 15 minute floor'),
    })
  })

  it('accepts an interval at or above 15 for a widget with an entry', () => {
    expect(resolveServerUpdateInterval({ ...DYNAMIC_WIDGET, intervalMinutes: 30 })).toEqual({
      kind: 'ok',
      intervalMinutes: 30,
    })
  })

  it('rejects a non-integer or non-finite interval on either engine', () => {
    expect(resolveServerUpdateInterval({ ...DYNAMIC_WIDGET, intervalMinutes: 15.5 }).kind).toBe('invalid')
    expect(resolveServerUpdateInterval({ ...PAYLOAD_WIDGET, intervalMinutes: Number.NaN }).kind).toBe('invalid')
    expect(resolveServerUpdateInterval({ ...PAYLOAD_WIDGET, intervalMinutes: '30' }).kind).toBe('invalid')
  })
})

describe('resolveServerUpdateUrl', () => {
  const context = 'ios.widgets[portfolio].serverUpdate'

  it('accepts an absent url, so the app can supply one at runtime', () => {
    expect(resolveServerUpdateUrl(undefined, context)).toEqual({ kind: 'ok' })
  })

  it('accepts https', () => {
    expect(resolveServerUpdateUrl('https://api.example.com/widgets/portfolio', context)).toEqual({ kind: 'ok' })
  })

  it('accepts plain http for the dev hosts a simulator and an emulator reach', () => {
    expect(resolveServerUpdateUrl('http://localhost:3333', context)).toEqual({ kind: 'ok' })
    expect(resolveServerUpdateUrl('http://10.0.2.2:3333/widgets', context)).toEqual({ kind: 'ok' })
    expect(resolveServerUpdateUrl('http://127.0.0.1:3333', context)).toEqual({ kind: 'ok' })
  })

  it('warns rather than failing on plain http to another host, which release builds block', () => {
    const resolution = resolveServerUpdateUrl('http://192.168.1.5:3333', context)

    expect(resolution.kind).toBe('insecure')
    expect(resolution).toHaveProperty('warning', expect.stringContaining('cleartext'))
  })

  it('rejects a url with no scheme, which no platform HTTP stack accepts', () => {
    expect(resolveServerUpdateUrl('api.example.com/widgets', context).kind).toBe('invalid')
  })

  it('rejects a non-http scheme', () => {
    expect(resolveServerUpdateUrl('ftp://api.example.com', context).kind).toBe('invalid')
  })

  it('rejects an empty url', () => {
    expect(resolveServerUpdateUrl('   ', context).kind).toBe('invalid')
    expect(resolveServerUpdateUrl(42, context).kind).toBe('invalid')
  })
})

describe('validateServerUpdateRefresh', () => {
  it('accepts a boolean or nothing', () => {
    expect(validateServerUpdateRefresh(undefined, 'ctx')).toBeUndefined()
    expect(validateServerUpdateRefresh(true, 'ctx')).toBeUndefined()
  })

  it('rejects a non-boolean', () => {
    expect(validateServerUpdateRefresh('yes', 'ctx')).toContain('must be a boolean')
  })
})
