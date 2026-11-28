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

describe('configureAndroidManifest configuration activity', () => {
  const scores = {
    id: 'scores',
    entry: './widgets/scores.tsx',
    displayName: 'Scores',
    description: 'Live scores',
    targetCellWidth: 2,
    targetCellHeight: 2,
    appIntent: { parameters: [{ name: 'team', title: 'Team' }] },
  }

  const activityNames = async (widgets: any[], existing: Array<{ $: Record<string, string> }> = []) => {
    const modResults: ManifestConfig = {
      manifest: {
        $: { 'xmlns:android': 'http://schemas.android.com/apk/res/android' },
        'uses-permission': [],
        application: [{ $: { 'android:name': '.MainApplication' }, activity: existing }],
      },
    }
    const config = configureAndroidManifest({ mods: {} } as any, { enableNotifications: false, widgets })
    const manifestMod = config.mods!.android!.manifest as (config: unknown) => Promise<unknown>
    await manifestMod({ modResults, modRequest: {} })
    const activities = modResults.manifest.application[0]?.activity as Array<{ $: Record<string, string> }>
    return activities.map((activity) => activity.$['android:name'])
  }

  it('declares the activity once when a widget opts in', async () => {
    expect(
      await activityNames(
        [
          { ...scores, configurationScreen: true },
          { ...scores, id: 'more', configurationScreen: true },
        ],
        [{ $: { 'android:name': '.MainActivity' } }]
      )
    ).toEqual(['.MainActivity', 'voltra.dynamicwidget.VoltraWidgetConfigureActivity'])
  })

  it('removes the activity when no widget opts in any more', async () => {
    expect(
      await activityNames(
        [scores],
        [
          { $: { 'android:name': '.MainActivity' } },
          { $: { 'android:name': 'voltra.dynamicwidget.VoltraWidgetConfigureActivity' } },
        ]
      )
    ).toEqual(['.MainActivity'])
  })
})
