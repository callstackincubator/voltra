import { configureAndroidManifest } from './manifest'

type ManifestConfig = {
  manifest: {
    $: Record<string, string>
    'uses-permission': Array<{ $: Record<string, string> }>
    application: Array<Record<string, unknown>>
  }
}

const applyManifest = async (enableNotifications: boolean, modResults: ManifestConfig = emptyManifest()) => {
  const config = configureAndroidManifest({ mods: {} } as any, { enableNotifications, widgets: [] })
  const manifestMod = config.mods!.android!.manifest as (config: unknown) => Promise<unknown>

  await manifestMod({ modResults, modRequest: {} })

  return modResults
}

const emptyManifest = (): ManifestConfig => ({
  manifest: {
    $: { 'xmlns:android': 'http://schemas.android.com/apk/res/android' },
    'uses-permission': [],
    // The name Expo's template uses, and the one the manifest helpers match on.
    application: [{ $: { 'android:name': '.MainApplication' } }],
  },
})

const notificationPermissions = async (enableNotifications: boolean): Promise<string[]> => {
  const modResults = await applyManifest(enableNotifications)
  return modResults.manifest['uses-permission'].map((permission) => permission.$['android:name'])
}

const services = (modResults: ManifestConfig) =>
  ((modResults.manifest.application[0].service ?? []) as Array<{ $: Record<string, string> }>).map(
    (service) => service.$
  )

describe('configureAndroidManifest permissions', () => {
  it('adds exactly the permissions an ongoing notification asks for', async () => {
    expect(await notificationPermissions(true)).toEqual([
      'android.permission.POST_NOTIFICATIONS',
      'android.permission.POST_PROMOTED_NOTIFICATIONS',
      'android.permission.FOREGROUND_SERVICE',
      'android.permission.WAKE_LOCK',
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

describe('configureAndroidManifest headless event service', () => {
  const service = {
    'android:name': 'voltra.events.VoltraHeadlessEventService',
    'android:exported': 'false',
    'android:foregroundServiceType': 'shortService',
  }

  it('declares the unexported short foreground service when notifications are on', async () => {
    expect(services(await applyManifest(true))).toEqual([service])
  })

  it('declares nothing when notifications are off', async () => {
    expect(services(await applyManifest(false))).toEqual([])
  })

  it('adds the service and permissions only once when run again', async () => {
    const modResults = await applyManifest(true)
    await applyManifest(true, modResults)

    expect(services(modResults)).toEqual([service])
    expect(modResults.manifest['uses-permission']).toHaveLength(4)
  })
})

describe('configureAndroidManifest ongoing notification receivers', () => {
  const receivers = (modResults: ManifestConfig) =>
    ((modResults.manifest.application[0].receiver ?? []) as Array<{ $: Record<string, string> }>).map(
      (receiver) => receiver.$
    )
  const expected = [
    { 'android:name': 'voltra.VoltraOngoingNotificationDismissedReceiver', 'android:exported': 'false' },
    { 'android:name': 'voltra.VoltraOngoingNotificationActionReceiver', 'android:exported': 'false' },
  ]

  it('declares the dismissed and action receivers, unexported, when notifications are on', async () => {
    expect(receivers(await applyManifest(true))).toEqual(expected)
  })

  it('declares neither receiver when notifications are off', async () => {
    expect(receivers(await applyManifest(false))).toEqual([])
  })

  it('declares each receiver only once when run again', async () => {
    const modResults = await applyManifest(true)
    await applyManifest(true, modResults)

    expect(receivers(modResults)).toEqual(expected)
  })
})
