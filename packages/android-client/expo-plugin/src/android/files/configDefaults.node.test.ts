import * as fs from 'fs'
import * as os from 'os'
import * as path from 'path'

import type { AndroidWidgetConfig } from '../../types'
import { generateAndroidConfigDefaults } from './configDefaults'

function makeTempProjectRoot(): { platformProjectRoot: string; cleanup: () => void } {
  const platformProjectRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'voltra-android-config-defaults-'))
  return {
    platformProjectRoot,
    cleanup: () => fs.rmSync(platformProjectRoot, { recursive: true, force: true }),
  }
}

function widget(partial: Partial<AndroidWidgetConfig>): AndroidWidgetConfig {
  return {
    id: 'W',
    displayName: 'W',
    description: 'W',
    targetCellWidth: 2,
    targetCellHeight: 2,
    ...partial,
  }
}

const DEFAULTS_PATH = ['app', 'src', 'main', 'assets', 'voltra', 'widget_config_defaults.json']

describe('generateAndroidConfigDefaults', () => {
  it('emits the declared defaults keyed by widget id', async () => {
    const { platformProjectRoot, cleanup } = makeTempProjectRoot()
    try {
      await generateAndroidConfigDefaults({
        platformProjectRoot,
        widgets: [
          widget({
            id: 'AndroidClientDemoWidget',
            appIntent: { parameters: [{ name: 'label', title: 'Label', default: 'Hello' }] },
          }),
        ],
      })

      const file = path.join(platformProjectRoot, ...DEFAULTS_PATH)
      expect(fs.existsSync(file)).toBe(true)
      expect(JSON.parse(fs.readFileSync(file, 'utf8'))).toEqual({
        AndroidClientDemoWidget: { label: 'Hello' },
      })
    } finally {
      cleanup()
    }
  })

  it('omits parameters without a default, and writes nothing when no widget declares defaults', async () => {
    const { platformProjectRoot, cleanup } = makeTempProjectRoot()
    try {
      await generateAndroidConfigDefaults({
        platformProjectRoot,
        widgets: [
          widget({ id: 'NoConfig' }),
          widget({ id: 'NoDefault', appIntent: { parameters: [{ name: 'city', title: 'City' }] } }),
        ],
      })

      const file = path.join(platformProjectRoot, ...DEFAULTS_PATH)
      expect(fs.existsSync(file)).toBe(false)
    } finally {
      cleanup()
    }
  })
})
