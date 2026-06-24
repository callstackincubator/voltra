import * as fs from 'fs'
import * as os from 'os'
import * as path from 'path'

import { generateWidgetPreviewLayouts, __test__ } from './xml'

function makeTempProject(): { platformProjectRoot: string; cleanup: () => void } {
  const platformProjectRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'voltra-android-xml-'))

  return {
    platformProjectRoot,
    cleanup: () => fs.rmSync(platformProjectRoot, { recursive: true, force: true }),
  }
}

describe('localeKeyToAndroidValuesQualifier', () => {
  it('maps plain language tags to classic Android qualifiers', () => {
    expect(__test__.localeKeyToAndroidValuesQualifier('pl')).toBe('pl')
  })

  it('maps language-region tags to classic Android qualifiers', () => {
    expect(__test__.localeKeyToAndroidValuesQualifier('pt-BR')).toBe('pt-rBR')
    expect(__test__.localeKeyToAndroidValuesQualifier('pt_BR')).toBe('pt-rBR')
  })

  it('maps script tags to Android BCP-47 qualifiers', () => {
    expect(__test__.localeKeyToAndroidValuesQualifier('zh-Hans')).toBe('b+zh+Hans')
    expect(__test__.localeKeyToAndroidValuesQualifier('zh-Hans-CN')).toBe('b+zh+Hans+CN')
    expect(__test__.localeKeyToAndroidValuesQualifier('sr-Latn-RS')).toBe('b+sr+Latn+RS')
  })
})

describe('generateWidgetPreviewLayouts', () => {
  it('adds a configure activity only for client-rendered widgets with appIntent parameters', async () => {
    const { platformProjectRoot, cleanup } = makeTempProject()

    try {
      fs.mkdirSync(path.join(platformProjectRoot, 'app', 'src', 'main', 'res', 'xml'), { recursive: true })

      await generateWidgetPreviewLayouts({
        platformProjectRoot,
        projectRoot: platformProjectRoot,
        packageName: 'com.example.voltra',
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
        previewImageMap: new Map(),
      })

      const xmlPath = path.join(platformProjectRoot, 'app', 'src', 'main', 'res', 'xml', 'voltra_widget_demo_info.xml')
      expect(fs.readFileSync(xmlPath, 'utf8')).toContain(
        'android:configure="com.example.voltra.widget.VoltraWidget_demoConfigurationActivity"'
      )
      const serverXmlPath = path.join(
        platformProjectRoot,
        'app',
        'src',
        'main',
        'res',
        'xml',
        'voltra_widget_server_only_info.xml'
      )
      expect(fs.readFileSync(serverXmlPath, 'utf8')).not.toContain('android:configure=')
    } finally {
      cleanup()
    }
  })
})
