import * as fs from 'fs'
import * as os from 'os'
import * as path from 'path'

import { createAndroidDynamicWidgetsManifest, writeAndroidDynamicWidgetsManifest } from './manifest'

function makeTempProject(files: Record<string, string>): { projectRoot: string; cleanup: () => void } {
  const projectRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'voltra-android-manifest-'))

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

describe('createAndroidDynamicWidgetsManifest', () => {
  it('normalizes entries relative to the project root', () => {
    const { projectRoot, cleanup } = makeTempProject({
      'widgets/home.tsx': 'export default function HomeWidget() {}',
    })

    try {
      const manifest = createAndroidDynamicWidgetsManifest(projectRoot, [
        {
          id: 'home',
          entry: './widgets/home.tsx',
          displayName: 'Home',
          description: 'Home widget',
          targetCellWidth: 2,
          targetCellHeight: 2,
        },
      ])

      expect(manifest).toEqual({
        version: 1,
        platform: 'android',
        widgets: [{ id: 'home', entry: 'widgets/home.tsx' }],
      })
    } finally {
      cleanup()
    }
  })

  it('omits legacy widgets without entries', () => {
    const { projectRoot, cleanup } = makeTempProject({
      'widgets/home.tsx': 'export default function HomeWidget() {}',
    })

    try {
      const manifest = createAndroidDynamicWidgetsManifest(projectRoot, [
        {
          id: 'legacy',
          displayName: 'Legacy',
          description: 'Server-rendered widget',
          targetCellWidth: 2,
          targetCellHeight: 2,
        },
        {
          id: 'home',
          entry: './widgets/home.tsx',
          displayName: 'Home',
          description: 'Dynamic widget',
          targetCellWidth: 2,
          targetCellHeight: 2,
        },
      ])

      expect(manifest).toEqual({
        version: 1,
        platform: 'android',
        widgets: [{ id: 'home', entry: 'widgets/home.tsx' }],
      })
    } finally {
      cleanup()
    }
  })
})

describe('writeAndroidDynamicWidgetsManifest', () => {
  it('writes the Android manifest with deterministic formatting', () => {
    const { projectRoot, cleanup } = makeTempProject({
      '.voltra/manifest.android.json': '{\n  "stale": true\n}\n',
      'widgets/home.tsx': 'export default function HomeWidget() {}',
    })

    try {
      writeAndroidDynamicWidgetsManifest(projectRoot, [
        {
          id: 'home',
          entry: './widgets/home.tsx',
          displayName: 'Home',
          description: 'Home widget',
          targetCellWidth: 2,
          targetCellHeight: 2,
        },
      ])

      const manifestPath = path.join(projectRoot, '.voltra', 'manifest.android.json')
      expect(fs.readFileSync(manifestPath, 'utf8')).toBe(
        [
          '{',
          '  "version": 1,',
          '  "platform": "android",',
          '  "widgets": [',
          '    {',
          '      "id": "home",',
          '      "entry": "widgets/home.tsx"',
          '    }',
          '  ]',
          '}',
          '',
        ].join('\n')
      )
    } finally {
      cleanup()
    }
  })

  it('writes an empty manifest instead of leaving stale widget declarations behind', () => {
    const { projectRoot, cleanup } = makeTempProject({
      '.voltra/manifest.android.json':
        '{\n  "version": 1,\n  "platform": "android",\n  "widgets": [{ "id": "old", "entry": "old.tsx" }]\n}\n',
    })

    try {
      writeAndroidDynamicWidgetsManifest(projectRoot, [])

      expect(fs.readFileSync(path.join(projectRoot, '.voltra', 'manifest.android.json'), 'utf8')).toBe(
        ['{', '  "version": 1,', '  "platform": "android",', '  "widgets": []', '}', ''].join('\n')
      )
    } finally {
      cleanup()
    }
  })
})
