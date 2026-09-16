import assert from 'node:assert/strict'
import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { describe, test } from 'node:test'

import { findMissingMetroWrapperWarning } from './metro.ts'

import type { NormalizedVoltraConfig } from '../config/types.ts'

async function createProject(files: Record<string, string>): Promise<string> {
  const projectRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'voltra-metro-'))

  for (const [filename, contents] of Object.entries(files)) {
    await fs.writeFile(path.join(projectRoot, filename), contents)
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

const WRAPPED = "const { withVoltra } = require('@use-voltra/metro')\nmodule.exports = withVoltra(config)\n"
const UNWRAPPED = 'module.exports = getDefaultConfig(__dirname)\n'

describe('metro wrapper detection', () => {
  test('warns when a Dynamic Widget is declared and the config is not wrapped', async () => {
    const projectRoot = await createProject({ 'metro.config.js': UNWRAPPED })

    const warning = await findMissingMetroWrapperWarning(configWith(projectRoot, './widgets/portfolio.tsx'))

    assert.match(warning ?? '', /withVoltra/)
    assert.match(warning ?? '', /metro\.config\.js/)
  })

  test('stays quiet when the config is wrapped', async () => {
    const projectRoot = await createProject({ 'metro.config.js': WRAPPED })

    assert.equal(await findMissingMetroWrapperWarning(configWith(projectRoot, './widgets/portfolio.tsx')), undefined)
  })

  test('stays quiet when no widget has an entry', async () => {
    const projectRoot = await createProject({ 'metro.config.js': UNWRAPPED })

    assert.equal(await findMissingMetroWrapperWarning(configWith(projectRoot, undefined)), undefined)
  })

  test('stays quiet when there is no Metro config to read', async () => {
    const projectRoot = await createProject({})

    assert.equal(await findMissingMetroWrapperWarning(configWith(projectRoot, './widgets/portfolio.tsx')), undefined)
  })

  test('finds the config under any of the names Metro resolves', async () => {
    const projectRoot = await createProject({ 'metro.config.cjs': UNWRAPPED })

    assert.match(
      (await findMissingMetroWrapperWarning(configWith(projectRoot, './widgets/portfolio.tsx'))) ?? '',
      /metro\.config\.cjs/
    )
  })
})
