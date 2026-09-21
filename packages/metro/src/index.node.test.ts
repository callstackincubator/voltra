import assert from 'node:assert/strict'
import fs from 'node:fs'
import Module from 'node:module'
import os from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { afterEach, describe, mock, test } from 'node:test'

import { withVoltra } from './index.ts'

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
  const projectRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'voltra-metro-config-'))
  fs.symlinkSync(path.join(repoRoot, 'node_modules'), path.join(projectRoot, 'node_modules'), 'dir')
  writeFile(
    path.join(projectRoot, 'package.json'),
    JSON.stringify({ name: 'voltra-metro-config-test-project', private: true }, null, 2)
  )

  for (const [relativePath, contents] of Object.entries(files)) {
    writeFile(path.join(projectRoot, relativePath), contents)
  }

  return {
    projectRoot,
    cleanup: () => fs.rmSync(projectRoot, { recursive: true, force: true }),
  }
}

function installProjectModuleStubs() {
  const originalLoad = Module._load
  const calls: string[] = []
  let widgetConfig: any

  mock.method(Module, '_load', function mockedLoad(request: string, parent: NodeModule, isMain: boolean) {
    if (request === 'metro-config') {
      calls.push(request)
      return {
        async getDefaultConfig(projectRoot: string) {
          return {
            projectRoot,
            resolver: {},
            serializer: {},
            transformer: {},
            server: {},
          }
        },
      }
    }

    if (request === 'metro') {
      calls.push(request)
      return {
        async createConnectMiddleware(config: any) {
          calls.push('metro.createConnectMiddleware')
          widgetConfig = config
          return {
            middleware(_req: unknown, _res: unknown, next: () => void) {
              next()
            },
          }
        },
      }
    }

    if (request === 'connect') {
      calls.push(request)
      return function connect() {
        return {
          use() {
            return this
          },
        }
      }
    }

    return originalLoad.apply(this, [request, parent, isMain])
  })

  return {
    calls,
    getWidgetConfig: () => widgetConfig,
  }
}

describe('withVoltra Metro config transformer', () => {
  const cleanups: Array<() => void> = []

  afterEach(() => {
    while (cleanups.length > 0) {
      cleanups.pop()?.()
    }
    mock.restoreAll()
  })

  test('keeps widget Metro dormant when no Dynamic Widgets are configured', async () => {
    const { projectRoot, cleanup } = makeTempProject({
      '.voltra/manifest.ios.json': JSON.stringify({ version: 1, platform: 'ios', widgets: [] }, null, 2),
      '.voltra/manifest.android.json': JSON.stringify({ version: 1, platform: 'android', widgets: [] }, null, 2),
    })
    cleanups.push(cleanup)

    const { calls } = installProjectModuleStubs()
    const config = await withVoltra({
      projectRoot,
      resolver: {},
      server: {},
    })

    assert.equal(calls.includes('metro.createConnectMiddleware'), false)
    assert.equal(calls.includes('metro-config'), false)
    assert.equal(typeof config.resolver.resolveRequest, 'function')
  })

  test('starts widget Metro when at least one Dynamic Widget is configured', async () => {
    const { projectRoot, cleanup } = makeTempProject({
      '.voltra/manifest.ios.json': JSON.stringify(
        { version: 1, platform: 'ios', widgets: [{ id: 'home', entry: 'widgets/home.js' }] },
        null,
        2
      ),
      '.voltra/manifest.android.json': JSON.stringify({ version: 1, platform: 'android', widgets: [] }, null, 2),
      'widgets/home.js': 'export default function HomeWidget() { return null }\n',
    })
    cleanups.push(cleanup)

    const { calls, getWidgetConfig } = installProjectModuleStubs()
    const additionalWatchFolder = path.join(projectRoot, 'shared')
    const config = await withVoltra({
      projectRoot,
      resolver: {},
      server: {},
      watchFolders: [additionalWatchFolder],
    })

    assert.equal(calls.includes('metro-config'), true)
    assert.equal(calls.includes('metro.createConnectMiddleware'), true)
    assert.deepEqual(getWidgetConfig().watchFolders, [projectRoot, additionalWatchFolder])
    assert.equal(typeof config.server.enhanceMiddleware, 'function')
  })
})
