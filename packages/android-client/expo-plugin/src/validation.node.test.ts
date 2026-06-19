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

  it('requires an entry and normalizes it against the project root', () => {
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

  it('rejects widgets without an entry', () => {
    expect(() =>
      validateAndroidConfigPluginProps({
        widgets: [
          {
            id: 'demo',
            entry: undefined as unknown as string,
            displayName: 'Demo',
            description: 'Demo widget',
            targetCellWidth: 2,
            targetCellHeight: 2,
          },
        ],
      })
    ).toThrow(/Widget 'demo': entry is required/)
  })
})
