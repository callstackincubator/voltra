import * as fs from 'fs'
import * as os from 'os'
import * as path from 'path'

import {
  createIOSDynamicLiveActivitiesManifest,
  createIOSDynamicWidgetsManifest,
  generateIOSDynamicLiveActivitiesManifest,
  generateIOSDynamicWidgetsManifest,
} from './manifest'

function makeTempProject(files: Record<string, string>): { projectRoot: string; cleanup: () => void } {
  const projectRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'voltra-ios-manifest-'))

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

describe('createIOSDynamicWidgetsManifest', () => {
  it('normalizes entries relative to the project root', () => {
    const { projectRoot, cleanup } = makeTempProject({
      'widgets/home.tsx': 'export default function HomeWidget() {}',
    })

    try {
      const manifest = createIOSDynamicWidgetsManifest(projectRoot, [
        {
          id: 'home',
          entry: './widgets/home.tsx',
          displayName: 'Home',
          description: 'Home widget',
        },
      ])

      expect(manifest).toEqual({
        version: 1,
        platform: 'ios',
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
      const manifest = createIOSDynamicWidgetsManifest(projectRoot, [
        {
          id: 'legacy',
          displayName: 'Legacy',
          description: 'Server-rendered widget',
        },
        {
          id: 'home',
          entry: './widgets/home.tsx',
          displayName: 'Home',
          description: 'Dynamic widget',
        },
      ])

      expect(manifest).toEqual({
        version: 1,
        platform: 'ios',
        widgets: [{ id: 'home', entry: 'widgets/home.tsx' }],
      })
    } finally {
      cleanup()
    }
  })
})

describe('Dynamic Live Activity manifest generation', () => {
  it('uses the dedicated manifest and sorts declarations deterministically', () => {
    const { projectRoot, cleanup } = makeTempProject({
      'live-activities/alpha.tsx': 'export default function Alpha() {}',
      'live-activities/order.tsx': 'export default function Order() {}',
    })

    try {
      expect(
        createIOSDynamicLiveActivitiesManifest(projectRoot, [
          { id: 'order_finished', entry: './live-activities/order.tsx' },
          { id: 'alpha', entry: './live-activities/alpha.tsx' },
        ])
      ).toEqual({
        version: 1,
        platform: 'ios',
        liveActivities: [
          { id: 'alpha', entry: 'live-activities/alpha.tsx' },
          { id: 'order_finished', entry: 'live-activities/order.tsx' },
        ],
      })
    } finally {
      cleanup()
    }
  })

  it('always rewrites an empty dedicated manifest to remove stale declarations', () => {
    const { projectRoot, cleanup } = makeTempProject({
      '.voltra/manifest.ios.live-activities.json': '{"stale":true}\n',
    })

    try {
      generateIOSDynamicLiveActivitiesManifest({ projectRoot, liveActivities: [] })
      expect(fs.readFileSync(path.join(projectRoot, '.voltra', 'manifest.ios.live-activities.json'), 'utf8')).toBe(
        ['{', '  "version": 1,', '  "platform": "ios",', '  "liveActivities": []', '}', ''].join('\n')
      )
    } finally {
      cleanup()
    }
  })
})

describe('generateIOSDynamicWidgetsManifest', () => {
  it('writes the iOS manifest with deterministic formatting', () => {
    const { projectRoot, cleanup } = makeTempProject({
      '.voltra/manifest.ios.json': '{\n  "stale": true\n}\n',
      'widgets/home.tsx': 'export default function HomeWidget() {}',
    })

    try {
      generateIOSDynamicWidgetsManifest({
        projectRoot,
        widgets: [
          {
            id: 'home',
            entry: './widgets/home.tsx',
            displayName: 'Home',
            description: 'Home widget',
          },
        ],
      })

      const manifestPath = path.join(projectRoot, '.voltra', 'manifest.ios.json')
      expect(fs.readFileSync(manifestPath, 'utf8')).toBe(
        [
          '{',
          '  "version": 1,',
          '  "platform": "ios",',
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
      '.voltra/manifest.ios.json':
        '{\n  "version": 1,\n  "platform": "ios",\n  "widgets": [{ "id": "old", "entry": "old.tsx" }]\n}\n',
    })

    try {
      generateIOSDynamicWidgetsManifest({
        projectRoot,
        widgets: [],
      })

      expect(fs.readFileSync(path.join(projectRoot, '.voltra', 'manifest.ios.json'), 'utf8')).toBe(
        ['{', '  "version": 1,', '  "platform": "ios",', '  "widgets": []', '}', ''].join('\n')
      )
    } finally {
      cleanup()
    }
  })
})
