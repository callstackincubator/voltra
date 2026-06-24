import * as fs from 'fs'
import * as os from 'os'
import * as path from 'path'

import { validateIOSConfigPluginProps } from './validation'

function createProjectRoot(files: Record<string, string>): string {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'voltra-ios-validation-'))

  for (const [relativePath, contents] of Object.entries(files)) {
    const filePath = path.join(root, relativePath)
    fs.mkdirSync(path.dirname(filePath), { recursive: true })
    fs.writeFileSync(filePath, contents)
  }

  return root
}

describe('validateIOSConfigPluginProps', () => {
  it('accepts valid groupIdentifier', () => {
    expect(() =>
      validateIOSConfigPluginProps({
        groupIdentifier: 'group.com.example.app',
      })
    ).not.toThrow()
  })

  it('rejects groupIdentifier without group. prefix', () => {
    expect(() =>
      validateIOSConfigPluginProps({
        groupIdentifier: 'com.example.app',
      })
    ).toThrow(/must start with 'group.'/)
  })

  it('accepts legacy widgets without an entry', () => {
    expect(() =>
      validateIOSConfigPluginProps({
        widgets: [
          {
            id: 'home',
            displayName: 'Home',
            description: 'Home widget',
          },
        ],
      })
    ).not.toThrow()
  })

  it('requires a valid widget entry when present and resolves it against the project root', () => {
    const projectRoot = createProjectRoot({
      'widgets/home.tsx': 'export default function HomeWidget() {}',
    })

    try {
      expect(() =>
        validateIOSConfigPluginProps(
          {
            widgets: [
              {
                id: 'home',
                entry: './widgets/home.tsx',
                displayName: 'Home',
                description: 'Home widget',
              },
            ],
          },
          projectRoot
        )
      ).not.toThrow()
    } finally {
      fs.rmSync(projectRoot, { recursive: true, force: true })
    }
  })

  it('rejects invalid widget entries when present', () => {
    const projectRoot = createProjectRoot({})

    try {
      expect(() =>
        validateIOSConfigPluginProps(
          {
            widgets: [
              {
                id: 'home',
                entry: './widgets/missing.tsx',
                displayName: 'Home',
                description: 'Home widget',
              },
            ],
          },
          projectRoot
        )
      ).toThrow(/Widget 'home': entry file not found at widgets\/missing\.tsx/)
    } finally {
      fs.rmSync(projectRoot, { recursive: true, force: true })
    }
  })
})
