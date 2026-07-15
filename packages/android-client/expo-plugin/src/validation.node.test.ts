import * as fs from 'fs'
import * as os from 'os'
import * as path from 'path'

import { logger } from '@use-voltra/expo-plugin'

import { validateAndroidConfigPluginProps } from './validation'

function makeTempProject(files: Record<string, string>): { projectRoot: string; cleanup: () => void } {
  const projectRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'voltra-android-validation-'))

  for (const [relativePath, contents] of Object.entries(files)) {
    const filePath = path.join(projectRoot, relativePath)
    fs.mkdirSync(path.dirname(filePath), { recursive: true })
    fs.writeFileSync(filePath, contents)
  }

  return {
    projectRoot,
    cleanup: () => fs.rmSync(projectRoot, { recursive: true, force: true }),
  }
}

describe('validateAndroidConfigPluginProps', () => {
  it('accepts widgets with required cell sizes', () => {
    expect(() =>
      validateAndroidConfigPluginProps({
        widgets: [
          {
            id: 'demo',
            entry: './widgets/demo.tsx',
            displayName: 'Demo',
            description: 'Demo widget',
            targetCellWidth: 2,
            targetCellHeight: 2,
          },
        ],
      })
    ).not.toThrow()
  })

  it('rejects duplicate widget ids', () => {
    expect(() =>
      validateAndroidConfigPluginProps({
        widgets: [
          {
            id: 'demo',
            entry: './widgets/demo-one.tsx',
            displayName: 'Demo',
            description: 'One',
            targetCellWidth: 2,
            targetCellHeight: 2,
          },
          {
            id: 'demo',
            entry: './widgets/demo-two.tsx',
            displayName: 'Demo',
            description: 'Two',
            targetCellWidth: 2,
            targetCellHeight: 2,
          },
        ],
      })
    ).toThrow(/Duplicate Android widget ID/)
  })

  it('accepts legacy widgets without an entry', () => {
    expect(() =>
      validateAndroidConfigPluginProps({
        widgets: [
          {
            id: 'demo',
            displayName: 'Demo',
            description: 'Demo widget',
            targetCellWidth: 2,
            targetCellHeight: 2,
          },
        ],
      })
    ).not.toThrow()
  })

  it('accepts Dynamic Widget configuration with deepLink', () => {
    expect(() =>
      validateAndroidConfigPluginProps({
        widgets: [
          {
            id: 'demo',
            entry: './widgets/demo.tsx',
            displayName: 'Demo',
            description: 'Demo widget',
            targetCellWidth: 2,
            targetCellHeight: 2,
            appIntent: {
              parameters: [{ name: 'city' }],
            },
            configuration: {
              deepLink: 'voltra://widget-config',
            },
          },
        ],
      })
    ).not.toThrow()
  })

  it('rejects legacy widget configuration without an entry', () => {
    expect(() =>
      validateAndroidConfigPluginProps({
        widgets: [
          {
            id: 'demo',
            displayName: 'Demo',
            description: 'Demo widget',
            targetCellWidth: 2,
            targetCellHeight: 2,
            configuration: {
              deepLink: 'voltra://widget-config',
            },
          },
        ],
      })
    ).toThrow(/configuration is supported only for Dynamic Widgets with entry/)
  })

  it.each([[null], [[]], [123]])('rejects malformed configuration value: %p', (configuration) => {
    expect(() =>
      validateAndroidConfigPluginProps({
        widgets: [
          {
            id: 'demo',
            entry: './widgets/demo.tsx',
            displayName: 'Demo',
            description: 'Demo widget',
            targetCellWidth: 2,
            targetCellHeight: 2,
            configuration: configuration as never,
          },
        ],
      })
    ).toThrow(/configuration must be an object with deepLink/)
  })

  it.each([[''], ['   '], [123 as unknown as string]])('rejects invalid configuration.deepLink: %p', (deepLink) => {
    expect(() =>
      validateAndroidConfigPluginProps({
        widgets: [
          {
            id: 'demo',
            entry: './widgets/demo.tsx',
            displayName: 'Demo',
            description: 'Demo widget',
            targetCellWidth: 2,
            targetCellHeight: 2,
            configuration: {
              deepLink,
            },
          },
        ],
      })
    ).toThrow(/configuration\.deepLink must be a non-empty string/)
  })

  it('warns when configuration.deepLink is set without appIntent parameters', () => {
    const warnSpy = jest.spyOn(logger, 'warn').mockImplementation(() => undefined)

    try {
      expect(() =>
        validateAndroidConfigPluginProps({
          widgets: [
            {
              id: 'demo',
              entry: './widgets/demo.tsx',
              displayName: 'Demo',
              description: 'Demo widget',
              targetCellWidth: 2,
              targetCellHeight: 2,
              configuration: {
                deepLink: 'voltra://widget-config',
              },
            },
          ],
        })
      ).not.toThrow()
      expect(warnSpy).toHaveBeenCalledTimes(1)
      expect(warnSpy).toHaveBeenCalledWith(
        expect.stringContaining('configuration.deepLink is set but appIntent.parameters is missing or empty')
      )
    } finally {
      warnSpy.mockRestore()
    }
  })

  it('requires a valid entry when present and normalizes it against the project root', () => {
    const { projectRoot, cleanup } = makeTempProject({
      'widgets/demo.tsx': 'export default () => null\n',
    })

    try {
      expect(() =>
        validateAndroidConfigPluginProps(
          {
            widgets: [
              {
                id: 'demo',
                entry: './widgets/demo.tsx',
                displayName: 'Demo',
                description: 'Demo widget',
                targetCellWidth: 2,
                targetCellHeight: 2,
              },
            ],
          },
          projectRoot
        )
      ).not.toThrow()
    } finally {
      cleanup()
    }
  })

  it('rejects invalid widget entries when present', () => {
    const projectRoot = makeTempProject({}).projectRoot

    try {
      expect(() =>
        validateAndroidConfigPluginProps(
          {
            widgets: [
              {
                id: 'demo',
                entry: './widgets/missing.tsx',
                displayName: 'Demo',
                description: 'Demo widget',
                targetCellWidth: 2,
                targetCellHeight: 2,
              },
            ],
          },
          projectRoot
        )
      ).toThrow(/Widget 'demo': entry file not found at widgets\/missing\.tsx/)
    } finally {
      fs.rmSync(projectRoot, { recursive: true, force: true })
    }
  })
})
