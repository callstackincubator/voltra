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
  assert.match(result.issues[0].message, /@use-voltra\/ios is not installed/)
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
  assert.match(result.issues[0].message, /@use-voltra\/android is not installed/)
  assert.match(result.issues[0].message, /android config block/)
})
