import assert from 'node:assert/strict'
import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { describe, test } from 'node:test'

import { findMissingMetroPackageWarning } from './metro.ts'

import type { NormalizedVoltraConfig } from '../config/types.ts'

/**
 * A project root with its own `package.json`, so `createRequire` has an anchor, and optionally a
 * `node_modules/@use-voltra/metro` that resolves the `bundle-widgets` subpath the same way the real
 * package does.
 */
async function createProject({ withMetroInstalled }: { withMetroInstalled: boolean }): Promise<string> {
  const projectRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'voltra-metro-'))
  await fs.writeFile(path.join(projectRoot, 'package.json'), JSON.stringify({ name: 'app', version: '1.0.0' }))

  if (withMetroInstalled) {
    const packageRoot = path.join(projectRoot, 'node_modules', '@use-voltra', 'metro')
    await fs.mkdir(path.join(packageRoot, 'build', 'cjs', 'bin'), { recursive: true })
    await fs.writeFile(path.join(packageRoot, 'build', 'cjs', 'bin', 'bundle-widgets.js'), 'module.exports = {}\n')
    await fs.writeFile(
      path.join(packageRoot, 'package.json'),
      JSON.stringify({
        name: '@use-voltra/metro',
        version: '2.3.0',
        exports: { './bundle-widgets': './build/cjs/bin/bundle-widgets.js' },
      })
    )
  }

  return projectRoot
}

function configWith(projectRoot: string, entry: string | undefined): NormalizedVoltraConfig {
  return {
    projectRoot,
    android: {
      project: {},
      widgets: [
        {
          id: 'portfolio',
          displayName: 'Portfolio',
          description: 'Your holdings',
          targetCellWidth: 2,
          targetCellHeight: 2,
          entry,
        },
      ],
      fonts: [],
    },
    warnings: [],
  } as unknown as NormalizedVoltraConfig
}

describe('metro package detection', () => {
  test('warns when a Dynamic Widget is declared and the package is not installed', async () => {
    const projectRoot = await createProject({ withMetroInstalled: false })

    const warning = findMissingMetroPackageWarning(configWith(projectRoot, './widgets/portfolio.tsx'))

    assert.match(warning ?? '', /@use-voltra\/metro/)
    assert.match(warning ?? '', /prerendered initial state/)
  })

  test('stays quiet when the package resolves', async () => {
    const projectRoot = await createProject({ withMetroInstalled: true })

    assert.equal(findMissingMetroPackageWarning(configWith(projectRoot, './widgets/portfolio.tsx')), undefined)
  })

  test('stays quiet when no widget has an entry, however Metro is set up', async () => {
    const projectRoot = await createProject({ withMetroInstalled: false })

    assert.equal(findMissingMetroPackageWarning(configWith(projectRoot, undefined)), undefined)
  })

  test('does not warn at a project whose Metro config never names withVoltra', async () => {
    // A config delegating to a shared preset, or hand-composed from createVoltraMiddleware, is
    // correctly wired and must stay quiet — the package resolving is the whole signal.
    const projectRoot = await createProject({ withMetroInstalled: true })
    await fs.writeFile(
      path.join(projectRoot, 'metro.config.js'),
      "module.exports = require('@myorg/metro-config')(__dirname)\n"
    )

    assert.equal(findMissingMetroPackageWarning(configWith(projectRoot, './widgets/portfolio.tsx')), undefined)
  })
})
