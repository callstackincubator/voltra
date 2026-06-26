import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { afterEach, describe, test } from 'node:test'

import { requireProjectModule, resolveProjectModulePath } from './resolveProjectModule.ts'

type TempProject = {
  projectRoot: string
  cleanup: () => void
}

function writeFile(filePath: string, contents: string): void {
  fs.mkdirSync(path.dirname(filePath), { recursive: true })
  fs.writeFileSync(filePath, contents)
}

function makeTempProject(): TempProject {
  const projectRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'voltra-metro-resolve-'))

  writeFile(
    path.join(projectRoot, 'package.json'),
    JSON.stringify({ name: 'voltra-metro-resolve-test-project', private: true }, null, 2)
  )
  writeFile(
    path.join(projectRoot, 'node_modules', 'metro', 'package.json'),
    JSON.stringify({ name: 'metro', version: '0.82.0-test', main: 'index.js' }, null, 2)
  )
  writeFile(
    path.join(projectRoot, 'node_modules', 'metro', 'index.js'),
    'module.exports = { marker: "project-metro" }\n'
  )

  return {
    projectRoot,
    cleanup: () => fs.rmSync(projectRoot, { recursive: true, force: true }),
  }
}

describe('@use-voltra/metro project module resolution', () => {
  const cleanups: Array<() => void> = []

  afterEach(() => {
    while (cleanups.length > 0) {
      cleanups.pop()?.()
    }
  })

  test('resolves metro from project root', () => {
    const { projectRoot, cleanup } = makeTempProject()
    cleanups.push(cleanup)

    const metro = requireProjectModule<{ marker: string }>('metro', projectRoot)
    const metroPackagePath = resolveProjectModulePath('metro/package.json', projectRoot)
    const expectedMetroPackagePath = fs.realpathSync(path.join(projectRoot, 'node_modules', 'metro', 'package.json'))

    assert.equal(metro.marker, 'project-metro')
    assert.equal(metroPackagePath, expectedMetroPackagePath)
  })
})
