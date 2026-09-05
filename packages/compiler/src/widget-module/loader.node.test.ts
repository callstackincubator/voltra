import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { after, describe, it } from 'node:test'

import { createWidgetModuleLoader } from './loader'
import type { WidgetModulePlatform } from './policy'

const temporaryRoots: string[] = []

after(() => {
  for (const root of temporaryRoots) {
    fs.rmSync(root, { force: true, recursive: true })
  }
})

/**
 * Create a throwaway project whose Babel setup mirrors what an app provides, so the
 * loader exercises the same transpile path it takes in a real project.
 */
function createProject(files: Record<string, string>): string {
  const projectRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'voltra-widget-module-'))
  temporaryRoots.push(projectRoot)

  fs.writeFileSync(path.join(projectRoot, 'package.json'), JSON.stringify({ name: 'fixture-project' }))
  fs.writeFileSync(
    path.join(projectRoot, 'babel.config.js'),
    `module.exports = { presets: [${JSON.stringify(require.resolve('@react-native/babel-preset'))}] }\n`
  )

  // Babel's runtime helpers are injected into the transpiled output, so the fixture has to
  // resolve them the way a real app does.
  const runtimeDir = path.dirname(require.resolve('@babel/runtime/package.json'))
  const runtimeLink = path.join(projectRoot, 'node_modules', '@babel', 'runtime')
  fs.mkdirSync(path.dirname(runtimeLink), { recursive: true })
  fs.symlinkSync(runtimeDir, runtimeLink, 'dir')

  for (const [relativePath, contents] of Object.entries(files)) {
    const filePath = path.join(projectRoot, relativePath)
    fs.mkdirSync(path.dirname(filePath), { recursive: true })
    fs.writeFileSync(filePath, contents)
  }

  return projectRoot
}

function writePackage(projectRoot: string, packageName: string, source: string): void {
  const packageDir = path.join(projectRoot, 'node_modules', ...packageName.split('/'))
  fs.mkdirSync(packageDir, { recursive: true })
  fs.writeFileSync(path.join(packageDir, 'package.json'), JSON.stringify({ name: packageName, main: 'index.js' }))
  fs.writeFileSync(path.join(packageDir, 'index.js'), source)
}

function load(projectRoot: string, entry: string, platform: WidgetModulePlatform = 'ios'): any {
  const warnings: string[] = []
  const loader = createWidgetModuleLoader({ projectRoot, platform, onWarning: (message) => warnings.push(message) })
  return { exports: loader.load(path.join(projectRoot, entry)), loader, warnings }
}

describe('createWidgetModuleLoader', () => {
  it("serves StyleSheet and Platform for imports from 'react-native'", () => {
    const projectRoot = createProject({
      'widget.ts': [
        "import { Platform, StyleSheet } from 'react-native'",
        'const styles = StyleSheet.create({ title: { fontSize: 12 } })',
        'export const style = styles.title',
        'export const os = Platform.OS',
        "export const selected = Platform.select({ ios: 'apple', android: 'robot' })",
        '',
      ].join('\n'),
    })

    const ios = load(projectRoot, 'widget.ts', 'ios').exports
    assert.deepEqual({ ...ios.style }, { fontSize: 12 })
    assert.equal(ios.os, 'ios')
    assert.equal(ios.selected, 'apple')

    const android = load(projectRoot, 'widget.ts', 'android').exports
    assert.equal(android.os, 'android')
    assert.equal(android.selected, 'robot')
  })

  it('flattens nested styles the way StyleSheet.flatten does', () => {
    const projectRoot = createProject({
      'widget.ts': [
        "import { StyleSheet } from 'react-native'",
        'export const flat = StyleSheet.flatten([{ a: 1 }, null, [{ b: 2 }, { a: 3 }]])',
        '',
      ].join('\n'),
    })

    assert.deepEqual({ ...load(projectRoot, 'widget.ts').exports.flat }, { a: 3, b: 2 })
  })

  it('rejects a react-native symbol the shim does not implement', () => {
    const projectRoot = createProject({
      'widget.ts': ["import { Animated } from 'react-native'", 'export default Animated', ''].join('\n'),
    })

    assert.throws(() => load(projectRoot, 'widget.ts'), /'Animated' is not available to Voltra widget code/)
  })

  it('rejects a deep react-native import', () => {
    const projectRoot = createProject({
      'widget.ts': ["import x from 'react-native/Libraries/Text/Text'", 'export default x', ''].join('\n'),
    })

    assert.throws(() => load(projectRoot, 'widget.ts'), /cannot import 'react-native\/Libraries\/Text\/Text'/)
  })

  it('redirects client packages to their rendering package and warns once', () => {
    const projectRoot = createProject({
      'widget.ts': ["export { label } from '@use-voltra/ios-client'", ''].join('\n'),
      'other.ts': ["export { label } from '@use-voltra/ios-client'", ''].join('\n'),
    })
    writePackage(projectRoot, '@use-voltra/ios', "exports.label = 'ios'\n")
    writePackage(projectRoot, '@use-voltra/ios-client', "throw new Error('client package should not load')\n")

    const warnings: string[] = []
    const loader = createWidgetModuleLoader({
      projectRoot,
      platform: 'ios',
      onWarning: (message) => warnings.push(message),
    })

    assert.equal(loader.load<any>(path.join(projectRoot, 'widget.ts')).label, 'ios')
    assert.equal(loader.load<any>(path.join(projectRoot, 'other.ts')).label, 'ios')
    assert.deepEqual(warnings, ["Widget code imported '@use-voltra/ios-client'. Using '@use-voltra/ios' instead."])
  })

  it('resolves relative imports, directory indexes, and circular graphs', () => {
    const projectRoot = createProject({
      'widget.ts': ["import { name } from './shared'", 'export const label = `hello ${name}`', ''].join('\n'),
      'shared/index.ts': ["export const name = 'widget'", ''].join('\n'),
    })

    assert.equal(load(projectRoot, 'widget.ts').exports.label, 'hello widget')
  })

  it('reads the default export, falling back to the exports object', () => {
    const projectRoot = createProject({
      'default.ts': 'export default { variants: 1 }\n',
      'named.ts': 'export const variants = 2\n',
    })
    const loader = createWidgetModuleLoader({ projectRoot, platform: 'android' })

    assert.deepEqual({ ...(loader.loadDefaultExport(path.join(projectRoot, 'default.ts')) as any) }, { variants: 1 })
    assert.equal((loader.loadDefaultExport(path.join(projectRoot, 'named.ts')) as any).variants, 2)
  })

  it('wraps failures with the caller-supplied error factory', () => {
    const projectRoot = createProject({ 'widget.ts': "import './missing'\n" })
    class CustomError extends Error {}
    const loader = createWidgetModuleLoader({
      projectRoot,
      platform: 'ios',
      createError: (message) => new CustomError(message),
    })

    assert.throws(() => loader.load(path.join(projectRoot, 'widget.ts')), CustomError)
  })
})
