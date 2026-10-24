import { configureAndroidManifest } from './manifest'

type ManifestConfig = {
  manifest: {
    $: Record<string, string>
    'uses-permission': Array<{ $: Record<string, string> }>
    application: Array<Record<string, unknown>>
  }
}

const notificationPermissions = async (enableNotifications: boolean): Promise<string[]> => {
  const modResults: ManifestConfig = {
    manifest: {
      $: { 'xmlns:android': 'http://schemas.android.com/apk/res/android' },
      'uses-permission': [],
      // The name Expo's template uses, and the one the manifest helpers match on.
      application: [{ $: { 'android:name': '.MainApplication' } }],
    },
  }

  const config = configureAndroidManifest({ mods: {} } as any, { enableNotifications, widgets: [] })
  const manifestMod = config.mods!.android!.manifest as (config: unknown) => Promise<unknown>

  await manifestMod({ modResults, modRequest: {} })

  return modResults.manifest['uses-permission'].map((permission) => permission.$['android:name'])
}

describe('configureAndroidManifest permissions', () => {
  it('adds exactly the permissions an ongoing notification asks for', async () => {
    expect(await notificationPermissions(true)).toEqual([
      'android.permission.POST_NOTIFICATIONS',
      'android.permission.POST_PROMOTED_NOTIFICATIONS',
    ])
  })

  it('asks for nothing notification related when notifications are off', async () => {
    expect(await notificationPermissions(false)).toEqual([])
  })

  // Ongoing notifications are a status, not an interruption, and Android 14 only grants this to
  // calling and alarm apps. The list above already fails if it appears, this one says why.
  it('never asks for a full-screen intent', async () => {
    expect(await notificationPermissions(true)).not.toContain('android.permission.USE_FULL_SCREEN_INTENT')
  })
})

describe('configureAndroidManifest ongoing notification foreground service', () => {
  type ServiceEntry = { $: Record<string, string>; property?: Array<{ $: Record<string, string> }> }
  type ForegroundServiceManifest = ManifestConfig & {
    manifest: { application: Array<{ $: Record<string, string>; service?: ServiceEntry[] }> }
  }

  const createModResults = (): ForegroundServiceManifest => ({
    manifest: {
      $: { 'xmlns:android': 'http://schemas.android.com/apk/res/android' },
      'uses-permission': [],
      application: [{ $: { 'android:name': '.MainApplication' } }],
    },
  })

  const applyManifest = async (
    modResults: ForegroundServiceManifest,
    ongoingNotificationForegroundService?: Parameters<
      typeof configureAndroidManifest
    >[1]['ongoingNotificationForegroundService']
  ) => {
    const config = configureAndroidManifest({ mods: {} } as any, {
      enableNotifications: true,
      ongoingNotificationForegroundService,
      widgets: [],
    })
    const manifestMod = config.mods!.android!.manifest as (config: unknown) => Promise<unknown>
    await manifestMod({ modResults, modRequest: {} })
    return modResults
  }

  const permissionNames = (modResults: ForegroundServiceManifest) =>
    modResults.manifest['uses-permission'].map((permission) => permission.$['android:name'])

  const voltraServices = (modResults: ForegroundServiceManifest) =>
    (modResults.manifest.application[0].service ?? []).filter(
      (service) => service.$['android:name'] === 'voltra.ongoingnotification.VoltraOngoingNotificationService'
    )

  it('declares the service and its permissions once, even when applied twice', async () => {
    const modResults = createModResults()
    await applyManifest(modResults, { types: ['location', 'dataSync'] })
    await applyManifest(modResults, { types: ['location', 'dataSync'] })

    const permissions = permissionNames(modResults)
    for (const permission of [
      'android.permission.FOREGROUND_SERVICE',
      'android.permission.FOREGROUND_SERVICE_LOCATION',
      'android.permission.FOREGROUND_SERVICE_DATA_SYNC',
    ]) {
      expect(permissions.filter((name) => name === permission)).toHaveLength(1)
    }
    expect(permissions).not.toContain('android.permission.ACCESS_FINE_LOCATION')
    expect(permissions).not.toContain('android.permission.ACCESS_COARSE_LOCATION')

    expect(voltraServices(modResults)).toEqual([
      {
        $: {
          'android:name': 'voltra.ongoingnotification.VoltraOngoingNotificationService',
          'android:exported': 'false',
          'android:foregroundServiceType': 'location|dataSync',
        },
      },
    ])
  })

  it('adds only the base permission for shortService', async () => {
    const modResults = await applyManifest(createModResults(), { types: ['shortService'] })

    expect(
      permissionNames(modResults).filter((name) => name.startsWith('android.permission.FOREGROUND_SERVICE'))
    ).toEqual(['android.permission.FOREGROUND_SERVICE'])
  })

  it('writes the special use subtype property', async () => {
    const modResults = await applyManifest(createModResults(), {
      types: ['specialUse'],
      specialUseSubtype: 'Shows live delivery progress',
    })

    expect(permissionNames(modResults)).toContain('android.permission.FOREGROUND_SERVICE_SPECIAL_USE')
    expect(voltraServices(modResults)[0].property).toEqual([
      {
        $: {
          'android:name': 'android.app.PROPERTY_SPECIAL_USE_FGS_SUBTYPE',
          'android:value': 'Shows live delivery progress',
        },
      },
    ])
  })

  it('adds no foreground service entries without the key', async () => {
    const modResults = await applyManifest(createModResults())

    expect(permissionNames(modResults).some((name) => name.startsWith('android.permission.FOREGROUND_SERVICE'))).toBe(
      false
    )
    expect(modResults.manifest.application[0].service).toBeUndefined()
  })

  it('removes a stale service but keeps the permissions, which a library service may need', async () => {
    const modResults = createModResults()
    modResults.manifest.application[0].service = [
      { $: { 'android:name': '.TrackingService', 'android:foregroundServiceType': 'location' } },
    ]
    await applyManifest(modResults, { types: ['location', 'dataSync'] })
    await applyManifest(modResults)

    expect(voltraServices(modResults)).toEqual([])
    expect(modResults.manifest.application[0].service).toHaveLength(1)
    expect(permissionNames(modResults)).toEqual(
      expect.arrayContaining([
        'android.permission.FOREGROUND_SERVICE',
        'android.permission.FOREGROUND_SERVICE_LOCATION',
        'android.permission.FOREGROUND_SERVICE_DATA_SYNC',
      ])
    )
  })
})
