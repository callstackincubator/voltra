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
    entry: './widgets/W.tsx',
    displayName: 'W',
    description: 'W',
    targetCellWidth: 2,
    targetCellHeight: 2,
    ...partial,
  }
}

const DEFAULTS_PATH = ['app', 'src', 'main', 'assets', 'voltra', 'widget_config_defaults.json']
const DYNAMIC_PARAMETERS_PATH = ['app', 'src', 'main', 'assets', 'voltra', 'widget_dynamic_parameters.json']

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

  it('lists the dynamicOptions parameters of each widget in declared order, and removes the list when none remain', async () => {
    const { platformProjectRoot, cleanup } = makeTempProjectRoot()
    const file = path.join(platformProjectRoot, ...DYNAMIC_PARAMETERS_PATH)
    try {
      await generateAndroidConfigDefaults({
        platformProjectRoot,
        widgets: [
          widget({
            id: 'scores',
            appIntent: {
              parameters: [
                { name: 'team', title: 'Team', dynamicOptions: true },
                { name: 'units', title: 'Units', default: 'metric' },
                { name: 'league', title: 'League', dynamicOptions: true },
              ],
            },
          }),
          widget({ id: 'plain' }),
        ],
      })
      expect(JSON.parse(fs.readFileSync(file, 'utf8'))).toEqual({ scores: ['team', 'league'] })

      await generateAndroidConfigDefaults({ platformProjectRoot, widgets: [widget({ id: 'plain' })] })
      expect(fs.existsSync(file)).toBe(false)
    } finally {
      cleanup()
    }
  })
})
