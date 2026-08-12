import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import Module from 'node:module'
import { fileURLToPath } from 'node:url'
import { afterEach, describe, mock, test } from 'node:test'
import { createElement } from 'react'

import { bundleWidgets } from './bundleWidgets.ts'
import { createVoltraMiddleware } from './createVoltraMiddleware.ts'
import { createLiveActivityRegistry } from './liveActivityRegistry.ts'
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
    mock.restoreAll()
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

  for (const platform of ['ios', 'android'] as const) {
    test(`generated ${platform} Dynamic Widget adapters preserve reserved React prop names`, () => {
      const { projectRoot, cleanup } = makeTempProject({
        [`.voltra/manifest.${platform}.json`]: JSON.stringify(
          {
            version: 1,
            platform,
            widgets: [{ id: 'inbox', entry: 'widgets/inbox.js' }],
          },
          null,
          2
        ),
        'widgets/inbox.js': 'export default function InboxDynamicWidget() { return null }\n',
      })
      cleanups.push(cleanup)

      const registry = createWidgetRegistry({ projectRoot })

      try {
        const dynamicWidget = registry.getWidget(platform, 'inbox')
        assert.ok(dynamicWidget)

        const generatedAdapter = fs.readFileSync(dynamicWidget.generatedEntryPath, 'utf8')
        const executableAdapter = generatedAdapter
          .split('\n')
          .filter((line) => !line.startsWith('import '))
          .join('\n')
          .replace('export function render(propsJSON, envJSON)', 'function render(propsJSON, envJSON)')
          .replace('export default render', 'return render')

        type DynamicWidgetRender = (propsJSON: string, envJSON: string) => string
        type DynamicWidgetElement = {
          type: (props: Record<string, unknown>) => unknown
          props: Record<string, unknown>
        }
        type CreateDynamicWidgetElement = (
          type: DynamicWidgetElement['type'],
          props: Record<string, unknown>
        ) => DynamicWidgetElement

        const createAdapter = new Function('createElement', 'renderVariantToJson', 'Widget', executableAdapter) as (
          createElement: CreateDynamicWidgetElement,
          renderVariantToJson: (element: DynamicWidgetElement) => unknown,
          Widget: (props: Record<string, unknown>, env: Record<string, unknown>) => unknown
        ) => DynamicWidgetRender

        const render = createAdapter(
          createElement as unknown as CreateDynamicWidgetElement,
          (element) => element.type(element.props),
          (props, env) => ({ props, env })
        )
        const dynamicWidgetProps = {
          key: 'primary-inbox',
          unreadCount: 7,
          mailbox: { id: 'primary' },
        }
        const dynamicWidgetEnvironment = { widgetFamily: '200x100' }

        const rendered = JSON.parse(
          render(JSON.stringify(dynamicWidgetProps), JSON.stringify(dynamicWidgetEnvironment))
        )

        assert.deepEqual(rendered, {
          props: dynamicWidgetProps,
          env: dynamicWidgetEnvironment,
        })
      } finally {
        registry.close()
      }
    })
  }

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

  test('keeps Dynamic Live Activities in a separate registry when IDs collide with widgets', () => {
    const { projectRoot, cleanup } = makeTempProject({
      '.voltra/manifest.ios.json': JSON.stringify({
        version: 1,
        platform: 'ios',
        widgets: [{ id: 'order', entry: 'widgets/order.js' }],
      }),
      '.voltra/manifest.ios.live-activities.json': JSON.stringify({
        version: 1,
        platform: 'ios',
        liveActivities: [{ id: 'order', entry: 'live-activities/order.js' }],
      }),
      'widgets/order.js': 'export default function OrderWidget() { return null }\n',
      'live-activities/order.js': 'export default function OrderLiveActivity() { return {} }\n',
    })
    cleanups.push(cleanup)
    const widgets = createWidgetRegistry({ projectRoot })
    const liveActivities = createLiveActivityRegistry({ projectRoot })
    try {
      const widget = widgets.getWidget('ios', 'order')
      const liveActivity = liveActivities.getLiveActivity('order')
      assert.ok(widget)
      assert.ok(liveActivity)
      assert.notEqual(widget.generatedEntryPath, liveActivity.generatedEntryPath)
      const generated = fs.readFileSync(liveActivity.generatedEntryPath, 'utf8')
      assert.match(generated, /renderLiveActivityToJson/)
      assert.match(generated, /new Date\(environment.date\)/)
      assert.match(generated, /__voltraDynamicLiveActivities/)
      assert.match(generated, /__voltraDynamicLiveActivityDefinitionUpdated/)
      assert.match(generated, /\("order"\)/)
      assert.match(generated, /LiveActivity\(props, environment\)/)
    } finally {
      widgets.close()
      liveActivities.close()
    }
  })

  test('reports malformed Dynamic Live Activity manifests with collection-specific errors', () => {
    const { projectRoot, cleanup } = makeTempProject({
      '.voltra/manifest.ios.live-activities.json': JSON.stringify({ version: 1, platform: 'ios', widgets: [] }),
    })
    cleanups.push(cleanup)
    const registry = createLiveActivityRegistry({ projectRoot })
    try {
      assert.throws(
        () => registry.listLiveActivities(),
        /dynamic live activities manifest.*liveActivities must be an array/i
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
    mock.restoreAll()
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

  test('routes colliding Dynamic Live Activity bundles through their dedicated endpoint', () => {
    const { projectRoot, cleanup } = makeTempProject({
      '.voltra/manifest.ios.json': JSON.stringify({
        version: 1,
        platform: 'ios',
        widgets: [{ id: 'order', entry: 'widgets/order.js' }],
      }),
      '.voltra/manifest.ios.live-activities.json': JSON.stringify({
        version: 1,
        platform: 'ios',
        liveActivities: [{ id: 'order', entry: 'live-activities/order.js' }],
      }),
      'widgets/order.js': 'export default function OrderWidget() { return null }\n',
      'live-activities/order.js': 'export default function OrderLiveActivity() { return {} }\n',
    })
    cleanups.push(cleanup)
    const registry = createWidgetRegistry({ projectRoot })
    const liveActivityRegistry = createLiveActivityRegistry({ projectRoot })
    const calls: string[] = []
    const middleware = createVoltraMiddleware({
      registry,
      liveActivityRegistry,
      widgetMetro: {
        middleware(req: { url: string }) {
          calls.push(req.url)
        },
      },
    })
    const response = { writeHead() {}, end() {} }
    try {
      middleware({ url: '/live-activities/order.bundle?platform=ios' }, response, () => {})
      assert.equal(calls.length, 1)
      assert.match(calls[0], /bundleEntry=.*live-activities/)
      assert.match(calls[0], /platform=ios/)
    } finally {
      registry.close()
      liveActivityRegistry.close()
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

  test('keeps release bundle filenames aligned with native loaders', async () => {
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

    const originalLoad = (Module as any)._load
    mock.method(Module as any, '_load', function (request: string, parent: unknown, isMain: boolean) {
      if (request === 'metro') {
        return {
          runBuild: async () => ({ code: 'bundle' }),
        }
      }

      if (request === 'metro-config') {
        return {
          loadConfig: async () => ({
            resolver: { sourceExts: [] },
            watchFolders: [],
            serializer: {},
            transformer: {},
            server: {},
          }),
          getDefaultConfig: async () => ({
            resolver: { sourceExts: [] },
            watchFolders: [],
            serializer: {},
            transformer: {},
            server: {},
          }),
        }
      }

      return originalLoad.call(this, request, parent, isMain)
    })

    const outDir = path.join(projectRoot, 'dist', 'widgets')
    await bundleWidgets({
      projectRoot,
      outDir,
      platform: 'ios',
    })

    assert.deepEqual(fs.readdirSync(outDir), ['voltra-widget-home.bundle'])
  })

  test('bakes Dynamic Live Activity bundles with their dedicated release prefix', async () => {
    const { projectRoot, cleanup } = makeTempProject({
      '.voltra/manifest.ios.json': JSON.stringify({
        version: 1,
        platform: 'ios',
        widgets: [{ id: 'order', entry: 'widgets/order.js' }],
      }),
      '.voltra/manifest.ios.live-activities.json': JSON.stringify({
        version: 1,
        platform: 'ios',
        liveActivities: [{ id: 'order', entry: 'live-activities/order.js' }],
      }),
      'widgets/order.js': 'export default function OrderWidget() { return null }\n',
      'live-activities/order.js': 'export default function OrderLiveActivity() { return {} }\n',
    })
    cleanups.push(cleanup)
    const originalLoad = (Module as any)._load
    mock.method(Module as any, '_load', function (request: string, parent: unknown, isMain: boolean) {
      if (request === 'metro') return { runBuild: async () => ({ code: 'bundle' }) }
      if (request === 'metro-config')
        return {
          loadConfig: async () => ({ resolver: {}, watchFolders: [], serializer: {}, transformer: {}, server: {} }),
          getDefaultConfig: async () => ({
            resolver: {},
            watchFolders: [],
            serializer: {},
            transformer: {},
            server: {},
          }),
        }
      return originalLoad.call(this, request, parent, isMain)
    })
    const outDir = path.join(projectRoot, 'dist', 'widgets')
    await bundleWidgets({ projectRoot, outDir, platform: 'ios' })
    assert.deepEqual(fs.readdirSync(outDir).sort(), ['voltra-live-activity-order.bundle', 'voltra-widget-order.bundle'])
  })
})
