import * as fs from 'fs'
import * as os from 'os'
import * as path from 'path'

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

describe('validateAndroidConfigPluginProps serverUpdate', () => {
  const widget = {
    id: 'portfolio',
    displayName: 'Portfolio',
    description: 'Track holdings',
    targetCellWidth: 2,
    targetCellHeight: 2,
  }

  function validate(overrides: Record<string, unknown>): void {
    validateAndroidConfigPluginProps({ widgets: [{ ...widget, ...overrides }] } as never)
  }

  it('accepts a serverUpdate with no url, which the app supplies at runtime', () => {
    expect(() => validate({ serverUpdate: {} })).not.toThrow()
  })

  it('rejects a url no HTTP stack can reach', () => {
    expect(() => validate({ serverUpdate: { url: 'api.example.com' } })).toThrow(/absolute http\(s\) URL/)
  })

  it('rejects an interval below the payload floor', () => {
    expect(() => validate({ serverUpdate: { url: 'https://a.example.com', intervalMinutes: 5 } })).toThrow(
      /at least 15/
    )
  })

  it('clamps rather than rejects a short interval on a widget with an entry', () => {
    const warn = jest.spyOn(console, 'warn').mockImplementation(() => {})

    try {
      expect(() =>
        validate({
          entry: './widgets/portfolio.tsx',
          serverUpdate: { url: 'https://a.example.com', intervalMinutes: 5 },
        })
      ).not.toThrow()
      expect(warn).toHaveBeenCalledWith(expect.stringContaining('below the 15 minute floor'))
    } finally {
      warn.mockRestore()
    }
  })
})
