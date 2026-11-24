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

describe('configureAndroidManifest configure activity', () => {
  const runManifest = async (widgets: any[]) => {
    const modResults: ManifestConfig = {
      manifest: {
        $: { 'xmlns:android': 'http://schemas.android.com/apk/res/android' },
        'uses-permission': [],
        application: [{ $: { 'android:name': '.MainApplication' } }],
      },
    }
    const config = configureAndroidManifest({ mods: {} } as any, { enableNotifications: false, widgets })
    const manifestMod = config.mods!.android!.manifest as (config: unknown) => Promise<unknown>
    await manifestMod({ modResults, modRequest: {} })
    return (modResults.manifest.application[0]?.activity as Array<{ $: Record<string, string> }> | undefined) ?? []
  }

  it('registers VoltraWidgetConfigureActivity when a widget uses dynamicOptions', async () => {
    const activities = await runManifest([
      {
        id: 'masjid_times',
        displayName: 'Prayer Times',
        description: 'Prayer times',
        targetCellWidth: 4,
        targetCellHeight: 2,
        appIntent: { parameters: [{ name: 'masjid', title: 'Masjid', dynamicOptions: true }] },
      },
    ])

    expect(activities.map((a) => a.$['android:name'])).toEqual(['voltra.dynamicwidget.VoltraWidgetConfigureActivity'])
  })

  it('omits VoltraWidgetConfigureActivity when no widget uses dynamicOptions', async () => {
    const activities = await runManifest([
      {
        id: 'plain',
        displayName: 'Plain',
        description: 'Plain',
        targetCellWidth: 4,
        targetCellHeight: 2,
      },
    ])

    expect(activities).toEqual([])
  })
})
