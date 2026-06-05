const assert = require('node:assert/strict')
const { execFileSync } = require('node:child_process')
const fs = require('node:fs')
const os = require('node:os')
const path = require('node:path')
const test = require('node:test')

const packageRoot = path.resolve(__dirname, '..')

function loadCliModule() {
  return require(path.join(packageRoot, 'build/cjs/index.js'))
}

function loadIosMainAppEntitlementsModule() {
  return require(path.join(packageRoot, 'build/cjs/platforms/ios/mainAppEntitlements.js'))
}

function writeFakePackage(projectRoot, packageName) {
  const packagePath = path.join(projectRoot, 'node_modules', ...packageName.split('/'), 'package.json')
  fs.mkdirSync(path.dirname(packagePath), { recursive: true })
  fs.writeFileSync(packagePath, `${JSON.stringify({ name: packageName, version: '0.0.0' }, null, 2)}\n`)
}

test('apply help documents the yes flag', () => {
  const { getApplyHelpText } = loadCliModule()
  const helpText = getApplyHelpText()

  assert.match(helpText, /-y, --yes/)
  assert.match(helpText, /skip the dirty git worktree confirmation prompt/)
})

test('dirty worktree warning hides modified file paths', async () => {
  const { ensureGitWorktreeIsReady } = loadCliModule()
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'voltra-cli-test-'))
  const trackedFilePath = path.join(tempDir, 'tracked.txt')

  execFileSync('git', ['init'], { cwd: tempDir, stdio: 'ignore' })
  execFileSync('git', ['config', 'user.email', 'test@example.com'], { cwd: tempDir, stdio: 'ignore' })
  execFileSync('git', ['config', 'user.name', 'Voltra Test'], { cwd: tempDir, stdio: 'ignore' })

  fs.writeFileSync(trackedFilePath, 'before\n')
  execFileSync('git', ['add', 'tracked.txt'], { cwd: tempDir, stdio: 'ignore' })
  execFileSync('git', ['commit', '-m', 'init'], { cwd: tempDir, stdio: 'ignore' })

  fs.writeFileSync(trackedFilePath, 'after\n')

  const result = await ensureGitWorktreeIsReady({
    cwd: tempDir,
    allowDirty: true,
    interactive: false,
  })

  assert.equal(result.status.isDirty, true)
  assert.equal(result.status.entries.length, 1)
  assert.equal(result.warning, '[voltra] Warning: git worktree has 1 uncommitted change.')
  assert.doesNotMatch(result.warning, /tracked\.txt/)
})

test('unknown commands are reported once', () => {
  const cliPath = path.join(packageRoot, 'build/cjs/bin.js')

  assert.throws(
    () => {
      execFileSync('node', [cliPath, 'nope'], {
        cwd: packageRoot,
        stdio: 'pipe',
        encoding: 'utf8',
      })
    },
    (error) => {
      assert.equal(error.status, 1)
      assert.equal(error.stdout, '')
      assert.match(error.stderr, /unknown command 'nope'/)

      const occurrences = error.stderr.split("unknown command 'nope'").length - 1
      assert.equal(occurrences, 1)

      return true
    }
  )
})

test('ios preflight reports missing optional platform package', async () => {
  const { createIOSPreflightRunner } = loadCliModule()
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'voltra-cli-test-'))
  fs.writeFileSync(path.join(tempDir, 'package.json'), `${JSON.stringify({ private: true }, null, 2)}\n`)

  const result = await createIOSPreflightRunner({
    projectRoot: tempDir,
    ios: {
      project: {},
    },
  })({ requestedPlatforms: ['ios'] })

  assert.equal(result.platform, 'ios')
  assert.match(result.issues[0].message, /@use-voltra\/ios/)
  assert.match(result.issues[0].message, /@use-voltra\/ios-client/)
  assert.match(result.issues[0].message, /ios config block/)
})

test('android preflight reports missing optional platform package', async () => {
  const { createAndroidPreflightRunner } = loadCliModule()
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'voltra-cli-test-'))
  fs.writeFileSync(path.join(tempDir, 'package.json'), `${JSON.stringify({ private: true }, null, 2)}\n`)

  const result = await createAndroidPreflightRunner({
    projectRoot: tempDir,
    android: {
      project: {},
    },
  })({ requestedPlatforms: ['android'] })

  assert.equal(result.platform, 'android')
  assert.match(result.issues[0].message, /@use-voltra\/android/)
  assert.match(result.issues[0].message, /@use-voltra\/android-client/)
  assert.match(result.issues[0].message, /android config block/)
})

test('ios preflight reports missing client package when renderer is installed', async () => {
  const { createIOSPreflightRunner } = loadCliModule()
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'voltra-cli-test-'))
  fs.writeFileSync(path.join(tempDir, 'package.json'), `${JSON.stringify({ private: true }, null, 2)}\n`)
  writeFakePackage(tempDir, '@use-voltra/ios')

  const result = await createIOSPreflightRunner({
    projectRoot: tempDir,
    ios: {
      project: {},
    },
  })({ requestedPlatforms: ['ios'] })

  assert.equal(result.platform, 'ios')
  assert.match(result.issues[0].message, /@use-voltra\/ios-client/)
  assert.doesNotMatch(result.issues[0].message, /@use-voltra\/ios and/)
})

test('resolves the standard main app entitlements path when discovery is missing one', () => {
  const { resolveMainAppEntitlementsPath } = loadIosMainAppEntitlementsModule()
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'voltra-cli-test-'))

  const discovery = {
    iosRoot: path.join(tempDir, 'ios'),
    xcodeprojPath: path.join(tempDir, 'ios', 'TestApp.xcodeproj'),
    pbxprojPath: path.join(tempDir, 'ios', 'TestApp.xcodeproj', 'project.pbxproj'),
    podfilePath: path.join(tempDir, 'ios', 'Podfile'),
    mainTargetName: 'TestApp',
    mainTargetCandidates: ['TestApp'],
    infoPlistPath: path.join(tempDir, 'ios', 'TestApp', 'Info.plist'),
  }

  assert.equal(resolveMainAppEntitlementsPath(discovery), path.join(tempDir, 'ios', 'TestApp', 'TestApp.entitlements'))
})

test('ensureEntitlements creates the main app entitlements file when it is missing', async () => {
  const { ensureEntitlements } = loadCliModule()
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'voltra-cli-test-'))
  const iosRoot = path.join(tempDir, 'ios')
  const infoPlistPath = path.join(iosRoot, 'TestApp', 'Info.plist')
  const entitlementsPath = path.join(iosRoot, 'TestApp', 'TestApp.entitlements')

  fs.mkdirSync(path.dirname(infoPlistPath), { recursive: true })
  fs.writeFileSync(
    infoPlistPath,
    `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict></dict>
</plist>
`
  )

  const result = await ensureEntitlements({
    projectRoot: tempDir,
    ios: {
      enablePushNotifications: true,
      groupIdentifier: 'group.com.example.app',
      project: {},
    },
    discovery: {
      iosRoot,
      xcodeprojPath: path.join(iosRoot, 'TestApp.xcodeproj'),
      pbxprojPath: path.join(iosRoot, 'TestApp.xcodeproj', 'project.pbxproj'),
      podfilePath: path.join(iosRoot, 'Podfile'),
      mainTargetName: 'TestApp',
      mainTargetCandidates: ['TestApp'],
      infoPlistPath,
    },
  })

  assert.ok(result.change)
  assert.equal(fs.existsSync(entitlementsPath), true)
  const entitlements = fs.readFileSync(entitlementsPath, 'utf8')
  assert.match(entitlements, /com\.apple\.security\.application-groups/)
  assert.match(entitlements, /group\.com\.example\.app/)
  assert.match(entitlements, /aps-environment/)
})

test('android preflight reports missing client package when renderer is installed', async () => {
  const { createAndroidPreflightRunner } = loadCliModule()
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'voltra-cli-test-'))
  fs.writeFileSync(path.join(tempDir, 'package.json'), `${JSON.stringify({ private: true }, null, 2)}\n`)
  writeFakePackage(tempDir, '@use-voltra/android')

  const result = await createAndroidPreflightRunner({
    projectRoot: tempDir,
    android: {
      project: {},
    },
  })({ requestedPlatforms: ['android'] })

  assert.equal(result.platform, 'android')
  assert.match(result.issues[0].message, /@use-voltra\/android-client/)
  assert.doesNotMatch(result.issues[0].message, /@use-voltra\/android and/)
})

test('android config normalization rejects missing widget dimensions', () => {
  const { VoltraConfigNormalizationError, normalizeVoltraConfig } = loadCliModule()
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'voltra-cli-test-'))

  assert.throws(
    () => {
      normalizeVoltraConfig({
        configDir: tempDir,
        configPath: path.join(tempDir, 'voltra.config.json'),
        config: {
          android: {
            widgets: [
              {
                id: 'portfolio',
                displayName: 'Portfolio',
                description: 'Track holdings',
                targetCellHeight: 2,
              },
            ],
          },
        },
      })
    },
    (error) => {
      assert.ok(error instanceof VoltraConfigNormalizationError)
      assert.match(error.message, /android\.widgets\[portfolio\]\.targetCellWidth must be a positive integer/)
      return true
    }
  )
})
