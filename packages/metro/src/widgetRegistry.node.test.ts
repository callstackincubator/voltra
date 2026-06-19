import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { afterEach, describe, test } from 'node:test'

import { bundleWidgets } from './bundleWidgets.ts'
import { createVoltraMiddleware } from './createVoltraMiddleware.ts'
import { createWidgetRegistry } from './widgetRegistry.ts'

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..')

type TempProject = {
  projectRoot: string
  cleanup: () => void
}

function writeFile(filePath: string, contents: string): void {
  fs.mkdirSync(path.dirname(filePath), { recursive: true })
  fs.writeFileSync(filePath, contents)
}

function makeTempProject(files: Record<string, string>): TempProject {
  const projectRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'voltra-metro-manifest-'))
  fs.symlinkSync(path.join(repoRoot, 'node_modules'), path.join(projectRoot, 'node_modules'), 'dir')
  writeFile(
    path.join(projectRoot, 'package.json'),
    JSON.stringify({ name: 'voltra-metro-test-project', private: true }, null, 2)
  )

  for (const [relativePath, contents] of Object.entries(files)) {
    writeFile(path.join(projectRoot, relativePath), contents)
  }

  return {
    projectRoot,
    cleanup: () => fs.rmSync(projectRoot, { recursive: true, force: true }),
  }
}

function toPosix(value: string): string {
  return value.split(path.sep).join('/')
}

describe('@use-voltra/metro manifest registry', () => {
  const cleanups: Array<() => void> = []

  afterEach(() => {
    while (cleanups.length > 0) {
      cleanups.pop()?.()
    }
  })

  test('loads platform manifests independently and generates default-export adapters', () => {
    const { projectRoot, cleanup } = makeTempProject({
      '.voltra/manifest.ios.json': JSON.stringify(
        {
          version: 1,
          platform: 'ios',
          widgets: [{ id: 'home', entry: 'widgets/ios-home.js' }],
        },
        null,
        2
      ),
      '.voltra/manifest.android.json': JSON.stringify(
        {
          version: 1,
          platform: 'android',
          widgets: [{ id: 'home', entry: 'widgets/android-home.js' }],
        },
        null,
        2
      ),
      'widgets/ios-home.js': 'export default function IosHomeWidget() { return null }\n',
      'widgets/android-home.js': 'export default function AndroidHomeWidget() { return null }\n',
    })
    cleanups.push(cleanup)

    const registry = createWidgetRegistry({ projectRoot })

    try {
      const iosWidget = registry.getWidget('ios', 'home')
      const androidWidget = registry.getWidget('android', 'home')

      assert.ok(iosWidget)
      assert.ok(androidWidget)
      assert.equal(iosWidget?.platform, 'ios')
      assert.equal(androidWidget?.platform, 'android')
      assert.notEqual(iosWidget?.generatedEntryPath, androidWidget?.generatedEntryPath)
      assert.ok(path.basename(iosWidget!.generatedEntryPath).startsWith('ios-home-'))
      assert.ok(path.basename(androidWidget!.generatedEntryPath).startsWith('android-home-'))
      assert.deepEqual(
        registry.listWidgets('ios').map((widget) => widget.id),
        ['home']
      )
      assert.deepEqual(
        registry
          .listWidgets()
          .map((widget) => `${widget.platform}:${widget.id}`)
          .sort(),
        ['android:home', 'ios:home']
      )

      const iosGenerated = fs.readFileSync(iosWidget!.generatedEntryPath, 'utf8')
      const iosEntryImport = toPosix(
        path.relative(path.dirname(iosWidget!.generatedEntryPath), path.join(projectRoot, iosWidget!.entry))
      )
      assert.ok(iosGenerated.includes(`import Widget from ${JSON.stringify(iosEntryImport)}`))
      assert.ok(!iosGenerated.includes('import * as WidgetModule'))
      assert.ok(!iosGenerated.includes('export { Widget }'))
      assert.match(iosGenerated, /export function render\(propsJSON, envJSON\)/)

      const iosBarrel = fs.readFileSync(path.join(projectRoot, '.voltra', 'metro', 'widget-hot-reload.ios.js'), 'utf8')
      const iosBarrelImport = `./${toPosix(
        path.relative(path.join(projectRoot, '.voltra', 'metro'), iosWidget!.generatedEntryPath)
      )}`
      assert.ok(iosBarrel.includes(`import ${JSON.stringify(iosBarrelImport)}`))
      assert.ok(iosBarrel.includes('manifest-declared Voltra widgets'))
    } finally {
      registry.close()
    }
  })

  test('surfaces a missing platform manifest when a widget is requested', () => {
    const { projectRoot, cleanup } = makeTempProject({
      '.voltra/manifest.ios.json': JSON.stringify(
        {
          version: 1,
          platform: 'ios',
          widgets: [{ id: 'home', entry: 'widgets/home.js' }],
        },
        null,
        2
      ),
      'widgets/home.js': 'export default function HomeWidget() { return null }\n',
    })
    cleanups.push(cleanup)

    const registry = createWidgetRegistry({ projectRoot })

    try {
      assert.throws(
        () => registry.getWidget('android', 'home'),
        /Missing Voltra dynamic widgets manifest for android at \.voltra\/manifest\.android\.json\. Run Expo prebuild for android to generate it\./
      )
    } finally {
      registry.close()
    }
  })
})

describe('@use-voltra/metro middleware and bundling', () => {
  const cleanups: Array<() => void> = []

  afterEach(() => {
    while (cleanups.length > 0) {
      cleanups.pop()?.()
    }
  })

  test('routes bundle requests by platform and widget id', () => {
    const { projectRoot, cleanup } = makeTempProject({
      '.voltra/manifest.ios.json': JSON.stringify(
        {
          version: 1,
          platform: 'ios',
          widgets: [{ id: 'home', entry: 'widgets/ios-home.js' }],
        },
        null,
        2
      ),
      '.voltra/manifest.android.json': JSON.stringify(
        {
          version: 1,
          platform: 'android',
          widgets: [{ id: 'home', entry: 'widgets/android-home.js' }],
        },
        null,
        2
      ),
      'widgets/ios-home.js': 'export default function IosHomeWidget() { return null }\n',
      'widgets/android-home.js': 'export default function AndroidHomeWidget() { return null }\n',
    })
    cleanups.push(cleanup)

    const registry = createWidgetRegistry({ projectRoot })
    const calls: string[] = []
    const middleware = createVoltraMiddleware({
      registry,
      widgetMetro: {
        middleware(req: { url: string }, _res: unknown, _next: () => void) {
          calls.push(req.url)
        },
      },
    })

    const response = {
      status: 0,
      body: '',
      writeHead(status: number) {
        this.status = status
      },
      end(chunk: string) {
        this.body = chunk
      },
    }

    try {
      middleware({ url: '/widgets/home.bundle?platform=android&dev=true' }, response, () => {
        throw new Error('next() should not be called for a matched widget bundle')
      })

      assert.equal(calls.length, 1)
      assert.ok(calls[0].startsWith('/voltra-widget.bundle?'))
      assert.match(calls[0], /platform=android/)
      assert.match(calls[0], /bundleEntry=.*android-home/)
      assert.equal(response.status, 0)
      assert.equal(response.body, '')
    } finally {
      registry.close()
    }
  })

  test('bakes no bundles for an empty manifest', async () => {
    const { projectRoot, cleanup } = makeTempProject({
      '.voltra/manifest.ios.json': JSON.stringify(
        {
          version: 1,
          platform: 'ios',
          widgets: [],
        },
        null,
        2
      ),
      '.voltra/manifest.android.json': JSON.stringify(
        {
          version: 1,
          platform: 'android',
          widgets: [],
        },
        null,
        2
      ),
    })
    cleanups.push(cleanup)

    const outDir = path.join(projectRoot, 'dist', 'widgets')
    await bundleWidgets({
      projectRoot,
      outDir,
      platform: 'ios',
    })

    assert.equal(fs.existsSync(outDir), false)
  })
})
