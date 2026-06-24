import { upsertAndroidWidgetManifestEntries } from './manifest'

describe('upsertAndroidWidgetManifestEntries', () => {
  it('adds a configuration activity only for client-rendered widgets', () => {
    const application = { $: {}, activity: [], receiver: [] } as any
    upsertAndroidWidgetManifestEntries(application, 'com.example.voltra', [
      {
        id: 'demo',
        displayName: 'Demo',
        description: 'Demo widget',
        targetCellWidth: 2,
        targetCellHeight: 2,
        clientRendered: true,
        appIntent: {
          parameters: [{ name: 'label', title: 'Label', default: 'Hello' }],
        },
      },
      {
        id: 'server_only',
        displayName: 'Server',
        description: 'Server widget',
        targetCellWidth: 2,
        targetCellHeight: 2,
        clientRendered: false,
        appIntent: {
          parameters: [{ name: 'label', title: 'Label', default: 'Hello' }],
        },
      },
    ])

    const activities = application.activity ?? []

    expect(activities).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          $: expect.objectContaining({
            'android:name': 'com.example.voltra.widget.VoltraWidget_demoConfigurationActivity',
            'android:exported': 'true',
            'android:theme': '@android:style/Theme.Translucent.NoTitleBar',
            'android:noHistory': 'true',
          }),
          'intent-filter': expect.arrayContaining([
            expect.objectContaining({
              action: expect.arrayContaining([
                expect.objectContaining({
                  $: expect.objectContaining({
                    'android:name': 'android.appwidget.action.APPWIDGET_CONFIGURE',
                  }),
                }),
              ]),
            }),
          ]),
        }),
      ])
    )
    expect(activities).toHaveLength(1)
  })
})
