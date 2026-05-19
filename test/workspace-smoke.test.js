const test = require('node:test')
const assert = require('node:assert/strict')
const { execSync } = require('node:child_process')
const fs = require('node:fs')
const path = require('node:path')

const REPO_ROOT = path.join(__dirname, '..')
const PACKAGES_DIR = path.join(REPO_ROOT, 'packages')

const BUILD_PACKAGES = [
  '@use-voltra/core',
  '@use-voltra/ios',
  '@use-voltra/android',
  '@use-voltra/server',
  '@use-voltra/ios-server',
  '@use-voltra/android-server',
  '@use-voltra/expo-plugin',
  '@use-voltra/ios-client',
  '@use-voltra/android-client',
]

const JS_TEST_PACKAGES = [
  '@use-voltra/core',
  '@use-voltra/ios',
  '@use-voltra/android',
  '@use-voltra/server',
  '@use-voltra/ios-server',
  '@use-voltra/android-server',
  '@use-voltra/generator',
  '@use-voltra/expo-plugin',
  '@use-voltra/ios-client',
  '@use-voltra/android-client',
]

const FACADE_SCAN_DIRS = [
  path.join(PACKAGES_DIR, 'core', 'src'),
  path.join(PACKAGES_DIR, 'ios', 'src'),
  path.join(PACKAGES_DIR, 'android', 'src'),
  path.join(PACKAGES_DIR, 'server', 'src'),
  path.join(PACKAGES_DIR, 'ios-server', 'src'),
  path.join(PACKAGES_DIR, 'android-server', 'src'),
  path.join(PACKAGES_DIR, 'generator', 'generator'),
  path.join(PACKAGES_DIR, 'expo-plugin', 'src'),
  path.join(PACKAGES_DIR, 'ios-client', 'src'),
  path.join(PACKAGES_DIR, 'ios-client', 'expo-plugin', 'src'),
  path.join(PACKAGES_DIR, 'android-client', 'src'),
  path.join(PACKAGES_DIR, 'android-client', 'expo-plugin', 'src'),
]

const SERVER_SCAN_DIRS = [
  path.join(PACKAGES_DIR, 'server', 'src'),
  path.join(PACKAGES_DIR, 'ios-server', 'src'),
  path.join(PACKAGES_DIR, 'android-server', 'src'),
]

const GENERATED_ARTIFACT_DIRS = [
  path.join(PACKAGES_DIR, 'ios', 'src', 'jsx', 'props'),
  path.join(PACKAGES_DIR, 'android', 'src', 'jsx', 'props'),
  path.join(PACKAGES_DIR, 'ios', 'src', 'payload'),
  path.join(PACKAGES_DIR, 'android', 'src', 'payload'),
  path.join(PACKAGES_DIR, 'core', 'src', 'payload'),
  path.join(PACKAGES_DIR, 'ios-client', 'ios', 'ui', 'Generated', 'Parameters'),
  path.join(PACKAGES_DIR, 'ios-client', 'ios', 'shared'),
  path.join(PACKAGES_DIR, 'android-client', 'android', 'src', 'main', 'java', 'voltra', 'models', 'parameters'),
  path.join(PACKAGES_DIR, 'android-client', 'android', 'src', 'main', 'java', 'voltra', 'payload'),
  path.join(PACKAGES_DIR, 'android-client', 'android', 'src', 'main', 'java', 'voltra', 'generated'),
]

const packageJsonByName = new Map(
  fs.readdirSync(PACKAGES_DIR).map((dirName) => {
    const packageJsonPath = path.join(PACKAGES_DIR, dirName, 'package.json')
    const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'))
    return [packageJson.name, packageJson]
  })
)

function listSourceFiles(dirPath) {
  if (!fs.existsSync(dirPath)) {
    return []
  }

  const results = []
  const stack = [dirPath]

  while (stack.length > 0) {
    const currentDir = stack.pop()
    const entries = fs.readdirSync(currentDir, { withFileTypes: true })

    for (const entry of entries) {
      const entryPath = path.join(currentDir, entry.name)
      if (entry.isDirectory()) {
        stack.push(entryPath)
        continue
      }

      if (/\.(c|m)?jsx?$|\.tsx?$/.test(entry.name)) {
        results.push(entryPath)
      }
    }
  }

  return results.sort()
}

function findMatchingFiles(dirPaths, pattern) {
  const matches = []

  for (const dirPath of dirPaths) {
    for (const filePath of listSourceFiles(dirPath)) {
      const content = fs.readFileSync(filePath, 'utf8')
      if (pattern.test(content)) {
        matches.push(path.relative(REPO_ROOT, filePath))
      }
      pattern.lastIndex = 0
    }
  }

  return matches
}

function parseWorkspaceTestScript(script) {
  return script
    .split('&&')
    .map((part) => part.trim())
    .filter((part) => part.startsWith('npm run test --workspace '))
    .map((part) => part.replace('npm run test --workspace ', ''))
}

function snapshotFiles(dirPaths) {
  const snapshot = new Map()

  for (const dirPath of dirPaths) {
    for (const filePath of listSourceFiles(dirPath)) {
      snapshot.set(filePath, fs.readFileSync(filePath, 'utf8'))
    }

    if (!fs.existsSync(dirPath)) {
      continue
    }

    for (const entry of fs.readdirSync(dirPath)) {
      const entryPath = path.join(dirPath, entry)
      if (fs.statSync(entryPath).isFile() && !snapshot.has(entryPath)) {
        snapshot.set(entryPath, fs.readFileSync(entryPath, 'utf8'))
      }
    }
  }

  return snapshot
}

function restoreSnapshot(snapshot, dirPaths) {
  for (const dirPath of dirPaths) {
    if (!fs.existsSync(dirPath)) {
      continue
    }

    for (const entry of fs.readdirSync(dirPath)) {
      const entryPath = path.join(dirPath, entry)
      if (fs.statSync(entryPath).isFile() && !snapshot.has(entryPath)) {
        fs.rmSync(entryPath)
      }
    }
  }

  for (const [filePath, content] of snapshot.entries()) {
    fs.writeFileSync(filePath, content, 'utf8')
  }
}

test('root scripts cover the intended workspaces', () => {
  const rootPackageJson = JSON.parse(fs.readFileSync(path.join(REPO_ROOT, 'package.json'), 'utf8'))

  assert.equal(rootPackageJson.scripts.generate, 'npm run generate --workspace @use-voltra/generator')
  assert.equal(rootPackageJson.scripts.build, 'turbo run build')
  assert.equal(rootPackageJson.scripts.buildAll ?? rootPackageJson.scripts['build:all'], 'turbo run build')
  assert.equal(rootPackageJson.scripts.typecheck, 'turbo run typecheck')
  assert.deepEqual(parseWorkspaceTestScript(rootPackageJson.scripts.test), JS_TEST_PACKAGES)

  for (const packageName of BUILD_PACKAGES) {
    assert.ok(packageJsonByName.get(packageName)?.scripts?.build, `${packageName} should define a build script`)
    assert.ok(packageJsonByName.get(packageName)?.scripts?.typecheck, `${packageName} should define a typecheck script`)
  }

  for (const packageName of JS_TEST_PACKAGES) {
    assert.ok(packageJsonByName.get(packageName)?.scripts?.test, `${packageName} should define a test script`)
  }
})

test('root generate script succeeds end to end', () => {
  const snapshot = snapshotFiles(GENERATED_ARTIFACT_DIRS)
  let output

  try {
    output = execSync('npm run generate', {
      cwd: REPO_ROOT,
      encoding: 'utf8',
      maxBuffer: 20 * 1024 * 1024,
    })
  } finally {
    restoreSnapshot(snapshot, GENERATED_ARTIFACT_DIRS)
  }

  assert.match(output, /Generation complete/)
})

test('package sources do not import the removed facade package', () => {
  const matches = findMatchingFiles(
    FACADE_SCAN_DIRS,
    /from\s+['"]voltra(?:\/[^'"]+)?['"]|require\(\s*['"]voltra(?:\/[^'"]+)?['"]\s*\)|import\(\s*['"]voltra(?:\/[^'"]+)?['"]\s*\)/g
  )
  assert.deepEqual(matches, [])
})

test('server packages stay free of client and platform-only imports', () => {
  const matches = findMatchingFiles(
    SERVER_SCAN_DIRS,
    /from\s+['"](?:expo|react-native|@use-voltra\/ios-client|@use-voltra\/android-client|@use-voltra\/expo-plugin)['"]|require\(\s*['"](?:expo|react-native|@use-voltra\/ios-client|@use-voltra\/android-client|@use-voltra\/expo-plugin)['"]\s*\)/g
  )

  assert.deepEqual(matches, [])
})
