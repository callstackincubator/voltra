#!/usr/bin/env node
// @ts-check
/**
 * Fast packaging-integrity guard.
 *
 * Runs `npm pack --dry-run --json` for each publishable package and asserts
 * that a curated set of *critical* files ends up inside the tarball. The pack
 * dry-run reads the package's real `files` allowlist and globs it against the
 * working tree, so a file that exists on disk but is missing from `files`
 * (exactly the v2.1.0 `android/CMakeLists.txt` incident) fails here.
 *
 * This layer is intentionally cheap — no install, no native build. The real
 * build layer (CI: build-android-from-tarball) covers the rest.
 *
 * Usage:
 *   node scripts/check-package-contents.mjs            # check every package
 *   node scripts/check-package-contents.mjs android-client
 */

import { execFileSync } from 'node:child_process'
import { existsSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const repoRoot = resolve(__dirname, '..')

/**
 * A critical entry is either:
 *  - a string: exact path (relative to package root) that must be in the tarball, or
 *  - { suffix }: at least one packed path must end with this suffix (e.g. a `.podspec`).
 *
 * @typedef {{ suffix: string }} SuffixMatcher
 * @typedef {{ dir: string, name: string, critical: Array<string | SuffixMatcher> }} PackageSpec
 */

/** @type {PackageSpec[]} */
const PACKAGES = [
  {
    dir: 'packages/android-client',
    name: '@use-voltra/android-client',
    critical: [
      // Native build inputs — the v2.1.0 regression that shipped a broken tarball.
      'android/CMakeLists.txt',
      'android/build.gradle',
      'android/src/main/cpp/voltra_js_renderer.cpp',
      // Config plugin entry points.
      'app.plugin.js',
      'expo-plugin/app.plugin.js',
      // JS build output consumed by the app.
      'build/module/index.js',
    ],
  },
  {
    dir: 'packages/ios-client',
    name: '@use-voltra/ios-client',
    critical: [
      { suffix: '.podspec' },
      'ios/Package.swift',
      'app.plugin.js',
      'expo-plugin/app.plugin.js',
      'build/module/index.js',
    ],
  },
]

/**
 * @param {string} packageDir
 * @returns {string[]} packed file paths, relative to the package root
 */
function listPackedFiles(packageDir) {
  const stdout = execFileSync('npm', ['pack', '--dry-run', '--json'], {
    cwd: packageDir,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'inherit'],
  })
  const parsed = JSON.parse(stdout)
  const entry = Array.isArray(parsed) ? parsed[0] : parsed
  if (!entry || !Array.isArray(entry.files)) {
    throw new Error(`Unexpected \`npm pack\` output for ${packageDir}`)
  }
  return entry.files.map((/** @type {{ path: string }} */ f) => f.path)
}

/**
 * @param {PackageSpec} spec
 * @param {string[]} packed
 * @returns {string[]} human-readable failures
 */
function findMissing(spec, packed) {
  const packedSet = new Set(packed)
  const missing = []
  for (const entry of spec.critical) {
    if (typeof entry === 'string') {
      if (!packedSet.has(entry)) missing.push(entry)
    } else if (!packed.some((p) => p.endsWith(entry.suffix))) {
      missing.push(`*${entry.suffix}`)
    }
  }
  return missing
}

function main() {
  const filter = process.argv.slice(2)
  const selected = filter.length
    ? PACKAGES.filter((p) => filter.some((f) => p.dir.endsWith(f) || p.name === f))
    : PACKAGES

  if (selected.length === 0) {
    console.error(`No matching packages for filter: ${filter.join(', ')}`)
    process.exit(1)
  }

  let failed = false
  for (const spec of selected) {
    const packageDir = join(repoRoot, spec.dir)
    if (!existsSync(join(packageDir, 'package.json'))) {
      console.error(`✗ ${spec.name}: package.json not found at ${packageDir}`)
      failed = true
      continue
    }

    const packed = listPackedFiles(packageDir)
    const missing = findMissing(spec, packed)

    if (missing.length) {
      failed = true
      console.error(`✗ ${spec.name}: ${missing.length} critical file(s) missing from tarball:`)
      for (const m of missing) console.error(`    - ${m}`)
      console.error(
        `  Fix: add the path(s) to the "files" allowlist in ${spec.dir}/package.json ` +
          `(and ensure the package is built so build/** exists).`
      )
    } else {
      console.log(`✓ ${spec.name}: all ${spec.critical.length} critical file(s) present (${packed.length} files packed)`)
    }
  }

  if (failed) {
    console.error('\nPackaging integrity check FAILED.')
    process.exit(1)
  }
  console.log('\nPackaging integrity check passed.')
}

main()
