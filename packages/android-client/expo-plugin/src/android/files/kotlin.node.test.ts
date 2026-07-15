import * as fs from 'fs'
import * as os from 'os'
import * as path from 'path'

import { generateWidgetConfigurationActivities } from './kotlin'

function makeTempProject(): { platformProjectRoot: string; cleanup: () => void } {
  const platformProjectRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'voltra-android-kotlin-'))

  return {
    platformProjectRoot,
    cleanup: () => fs.rmSync(platformProjectRoot, { recursive: true, force: true }),
  }
}

describe('generateWidgetConfigurationActivities', () => {
  it('writes a deep-link trampoline activity for configurable widgets', async () => {
    const { platformProjectRoot, cleanup } = makeTempProject()

    try {
      await generateWidgetConfigurationActivities({
        platformProjectRoot,
        packageName: 'com.example.voltra',
        scheme: 'exampleapp',
        widgetConfigurationRoute: 'widget-config',
        widgets: [
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
        ],
      })

      const filePath = path.join(
        platformProjectRoot,
        'app',
        'src',
        'main',
        'java',
        'com',
        'example',
        'voltra',
        'widget',
        'VoltraWidget_demoConfigurationActivity.kt'
      )

      const content = fs.readFileSync(filePath, 'utf8')
      expect(content).toContain('class VoltraWidget_demoConfigurationActivity : ReactActivity()')
      expect(content).toContain('exampleapp://widget-config?widgetId=demo&appWidgetId=$appWidgetId')
      expect(content).toContain('ReactActivityDelegateWrapper')
      expect(content).toContain('BuildConfig.IS_NEW_ARCHITECTURE_ENABLED')
      expect(
        fs.existsSync(
          path.join(
            platformProjectRoot,
            'app',
            'src',
            'main',
            'java',
            'com',
            'example',
            'voltra',
            'widget',
            'VoltraWidget_server_onlyConfigurationActivity.kt'
          )
        )
      ).toBe(false)
    } finally {
      cleanup()
    }
  })

  it('uses the default route when widgetConfigurationRoute is omitted', async () => {
    const { platformProjectRoot, cleanup } = makeTempProject()

    try {
      await generateWidgetConfigurationActivities({
        platformProjectRoot,
        packageName: 'com.example.voltra',
        scheme: 'exampleapp',
        widgets: [
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
        ],
      })

      const filePath = path.join(
        platformProjectRoot,
        'app',
        'src',
        'main',
        'java',
        'com',
        'example',
        'voltra',
        'widget',
        'VoltraWidget_demoConfigurationActivity.kt'
      )

      const content = fs.readFileSync(filePath, 'utf8')
      expect(content).toContain('exampleapp://voltraui/android-widget-config?widgetId=demo&appWidgetId=$appWidgetId')
    } finally {
      cleanup()
    }
  })
})
