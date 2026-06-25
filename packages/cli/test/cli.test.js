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

function writeFakeModule(projectRoot, packageName, source) {
  const packageDir = path.join(projectRoot, 'node_modules', ...packageName.split('/'))
  fs.mkdirSync(packageDir, { recursive: true })
  fs.writeFileSync(
    path.join(packageDir, 'package.json'),
    `${JSON.stringify({ name: packageName, version: '0.0.0', main: 'index.js' }, null, 2)}\n`
  )
  fs.writeFileSync(path.join(packageDir, 'index.js'), source)
}

function writeFakeBabelConfig(projectRoot) {
  fs.writeFileSync(path.join(projectRoot, 'babel.config.js'), 'module.exports = { presets: [] }\n')
}

function writeInfoPlist(filePath) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true })
  fs.writeFileSync(
    filePath,
    `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>CFBundleShortVersionString</key>
  <string>1.2.3</string>
  <key>CFBundleVersion</key>
  <string>42</string>
</dict>
</plist>
`
  )
}

function writeFakeReactNativeMinIOSVersion(projectRoot, version) {
  writeFakePackage(projectRoot, 'react-native')
  const helpersPath = path.join(projectRoot, 'node_modules', 'react-native', 'scripts', 'cocoapods', 'helpers.rb')
  fs.mkdirSync(path.dirname(helpersPath), { recursive: true })
  fs.writeFileSync(
    helpersPath,
    `module Helpers
  class Constants
    def self.min_ios_version_supported
      return '${version}'
    end
  end
end
`
  )
}

function createIOSPodfileTestOptions(projectRoot, podfileContent) {
  const iosRoot = path.join(projectRoot, 'ios')
  const podfilePath = path.join(iosRoot, 'Podfile')

  fs.mkdirSync(iosRoot, { recursive: true })
  fs.writeFileSync(podfilePath, podfileContent)

  return {
    projectRoot,
    ios: {
      deploymentTarget: '17.0',
      enablePushNotifications: false,
      fonts: [],
      project: {},
      userImagesPath: path.join(projectRoot, 'assets', 'voltra'),
      widgets: [],
    },
    discovery: {
      iosRoot,
      xcodeprojPath: path.join(iosRoot, 'TestApp.xcodeproj'),
      pbxprojPath: path.join(iosRoot, 'TestApp.xcodeproj', 'project.pbxproj'),
      podfilePath,
      mainTargetName: 'TestApp',
      mainTargetCandidates: ['TestApp'],
      infoPlistPath: path.join(iosRoot, 'TestApp', 'Info.plist'),
    },
  }
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
  assert.equal(result.change.kind, 'created')
  assert.equal(fs.existsSync(entitlementsPath), true)
  const entitlements = fs.readFileSync(entitlementsPath, 'utf8')
  assert.match(entitlements, /com\.apple\.security\.application-groups/)
  assert.match(entitlements, /group\.com\.example\.app/)
  assert.match(entitlements, /aps-environment/)
})

test('ensurePodfileBlock bumps literal iOS platform below Voltra minimum', async () => {
  const { ensurePodfileBlock } = loadCliModule()
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'voltra-cli-test-'))
  const options = createIOSPodfileTestOptions(tempDir, "platform :ios, '15.1'\n")

  const result = await ensurePodfileBlock(options)
  const podfile = fs.readFileSync(options.discovery.podfilePath, 'utf8')

  assert.equal(result.warnings, undefined)
  assert.match(podfile, /^platform :ios, '16\.4'$/m)
  assert.match(podfile, /VOLTRA MANAGED BLOCK/)
})

test('ensurePodfileBlock leaves compatible literal iOS platform untouched', async () => {
  const { ensurePodfileBlock } = loadCliModule()
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'voltra-cli-test-'))
  const options = createIOSPodfileTestOptions(tempDir, 'platform :ios, "17.2" # custom floor\n')

  const result = await ensurePodfileBlock(options)
  const podfile = fs.readFileSync(options.discovery.podfilePath, 'utf8')

  assert.equal(result.warnings, undefined)
  assert.match(podfile, /^platform :ios, "17\.2" # custom floor$/m)
})

test('ensurePodfileBlock compares iOS platform versions numerically', async () => {
  const { ensurePodfileBlock } = loadCliModule()
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'voltra-cli-test-'))
  const options = createIOSPodfileTestOptions(tempDir, "platform :ios, '16.10'\n")

  const result = await ensurePodfileBlock(options)
  const podfile = fs.readFileSync(options.discovery.podfilePath, 'utf8')

  assert.equal(result.warnings, undefined)
  assert.match(podfile, /^platform :ios, '16\.10'$/m)
})

test('ensurePodfileBlock bumps React Native min_ios_version_supported when it is below Voltra minimum', async () => {
  const { ensurePodfileBlock } = loadCliModule()
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'voltra-cli-test-'))
  writeFakeReactNativeMinIOSVersion(tempDir, '15.1')
  const options = createIOSPodfileTestOptions(tempDir, 'platform :ios, min_ios_version_supported\n')

  const result = await ensurePodfileBlock(options)
  const podfile = fs.readFileSync(options.discovery.podfilePath, 'utf8')

  assert.equal(result.warnings, undefined)
  assert.match(podfile, /^platform :ios, '16\.4'$/m)
})

test('ensurePodfileBlock leaves React Native min_ios_version_supported when it is already compatible', async () => {
  const { ensurePodfileBlock } = loadCliModule()
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'voltra-cli-test-'))
  writeFakeReactNativeMinIOSVersion(tempDir, '17.0')
  const options = createIOSPodfileTestOptions(tempDir, 'platform :ios, min_ios_version_supported\n')

  const result = await ensurePodfileBlock(options)
  const podfile = fs.readFileSync(options.discovery.podfilePath, 'utf8')

  assert.equal(result.warnings, undefined)
  assert.match(podfile, /^platform :ios, min_ios_version_supported$/m)
})

test('ensurePodfileBlock warns for unknown iOS platform expressions', async () => {
  const { ensurePodfileBlock } = loadCliModule()
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'voltra-cli-test-'))
  const options = createIOSPodfileTestOptions(tempDir, 'platform :ios, ENV.fetch("IOS_DEPLOYMENT_TARGET")\n')

  const result = await ensurePodfileBlock(options)
  const podfile = fs.readFileSync(options.discovery.podfilePath, 'utf8')

  assert.deepEqual(result.warnings, [
    'Could not verify the Podfile iOS platform declaration. Ensure it resolves to iOS 16.4 or newer.',
  ])
  assert.match(podfile, /^platform :ios, ENV\.fetch\("IOS_DEPLOYMENT_TARGET"\)$/m)
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

test('config normalization keeps Dynamic Widget entry project-relative', () => {
  const { normalizeVoltraConfig } = loadCliModule()
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'voltra-cli-test-'))

  const normalized = normalizeVoltraConfig({
    configDir: tempDir,
    configPath: path.join(tempDir, 'voltra.config.ts'),
    config: {
      ios: {
        widgets: [
          {
            id: 'dynamic_home',
            displayName: 'Dynamic Home',
            description: 'Shows live data',
            entry: './widgets/home.tsx',
            appIntent: {
              parameters: [{ name: 'label', title: 'Label', default: 'Hello' }],
            },
          },
        ],
      },
    },
  })

  assert.equal(normalized.ios.widgets[0].entry, 'widgets/home.tsx')
  assert.deepEqual(normalized.ios.widgets[0].appIntent, {
    parameters: [{ name: 'label', title: 'Label', default: 'Hello' }],
  })
})

test('generateIOSFiles writes Dynamic Widget manifest and AppIntent Swift scaffolding', async () => {
  const { generateIOSFiles } = loadCliModule()
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'voltra-cli-test-'))
  const iosRoot = path.join(tempDir, 'ios')
  const infoPlistPath = path.join(iosRoot, 'TestApp', 'Info.plist')
  const legacyStatePath = path.join(tempDir, 'widgets', 'legacy.js')
  const dynamicEntryPath = path.join(tempDir, 'widgets', 'dynamic.js')

  fs.writeFileSync(path.join(tempDir, 'package.json'), `${JSON.stringify({ private: true }, null, 2)}\n`)
  writeFakeBabelConfig(tempDir)
  writeFakeModule(
    tempDir,
    '@use-voltra/ios',
    `module.exports = {
  renderWidgetToString(variants) {
    return JSON.stringify({ kind: 'legacy', variants })
  },
  renderVoltraVariantToJson(element) {
    return { kind: 'dynamic', element }
  },
}
`
  )
  fs.mkdirSync(path.dirname(legacyStatePath), { recursive: true })
  fs.writeFileSync(legacyStatePath, `module.exports = { systemSmall: { title: 'Legacy' } }\n`)
  fs.writeFileSync(
    dynamicEntryPath,
    `module.exports = function Widget(_props, env) {
  return { family: env.widgetFamily, label: env.configuration ?? null }
}
`
  )
  writeInfoPlist(infoPlistPath)

  const result = await generateIOSFiles({
    projectRoot: tempDir,
    ios: {
      enablePushNotifications: false,
      deploymentTarget: '17.0',
      fonts: [],
      project: {},
      userImagesPath: path.join(tempDir, 'assets', 'voltra'),
      widgets: [
        {
          id: 'legacy',
          displayName: 'Legacy',
          description: 'Server rendered',
          supportedFamilies: ['systemSmall'],
          initialStatePath: legacyStatePath,
        },
        {
          id: 'dynamic',
          displayName: 'Dynamic "Path\\\\Name"',
          description: 'Client rendered',
          supportedFamilies: ['systemMedium'],
          entry: 'widgets/dynamic.js',
          serverUpdate: {
            url: 'https://example.com/widget',
            intervalMinutes: 30,
            refresh: true,
          },
          appIntent: {
            parameters: [{ name: 'label', title: 'Label', default: 'Hello' }],
          },
        },
      ],
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

  const manifest = JSON.parse(fs.readFileSync(path.join(tempDir, '.voltra', 'manifest.ios.json'), 'utf8'))
  assert.deepEqual(manifest, {
    version: 1,
    platform: 'ios',
    widgets: [{ id: 'dynamic', entry: 'widgets/dynamic.js' }],
  })

  const bundleSwift = fs.readFileSync(path.join(result.targetPath, 'VoltraWidgetBundle.swift'), 'utf8')
  assert.match(bundleSwift, /import AppIntents/)
  assert.match(bundleSwift, /AppIntentConfiguration\(/)
  assert.match(bundleSwift, /VoltraClientWidgetProvider\.loadEntry/)
  assert.match(bundleSwift, /VoltraClientWidgetContentView\(/)
  assert.match(bundleSwift, /static var title: LocalizedStringResource = "Configure Dynamic \\"Path\\\\\\\\Name\\""/)

  const initialStatesSwift = fs.readFileSync(path.join(result.targetPath, 'VoltraWidgetInitialStates.swift'), 'utf8')
  assert.match(initialStatesSwift, /"legacy"/)
  assert.match(initialStatesSwift, /"dynamic"/)
  const infoPlist = fs.readFileSync(path.join(result.targetPath, 'Info.plist'), 'utf8')
  assert.match(infoPlist, /Voltra_WidgetServerUrls/)
  assert.match(infoPlist, /https:\/\/example\.com\/widget/)
  assert.match(infoPlist, /NSAppTransportSecurity/)
  assert.match(infoPlist, /NSExceptionDomains/)
  assert.match(infoPlist, /localhost/)
  assert.match(infoPlist, /NSExceptionAllowsInsecureHTTPLoads/)
  assert.ok(result.files.includes('.voltra/manifest.ios.json'))
})

test('generateAndroidFiles writes Dynamic Widget manifest, client receiver, and config defaults', async () => {
  const { generateAndroidFiles } = loadCliModule()
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'voltra-cli-test-'))
  const appModuleRoot = path.join(tempDir, 'android', 'app')
  const resourceRoot = path.join(appModuleRoot, 'src', 'main')
  const legacyStatePath = path.join(tempDir, 'widgets', 'legacy.js')
  const dynamicEntryPath = path.join(tempDir, 'widgets', 'dynamic.js')

  fs.writeFileSync(path.join(tempDir, 'package.json'), `${JSON.stringify({ private: true }, null, 2)}\n`)
  writeFakeBabelConfig(tempDir)
  writeFakeModule(
    tempDir,
    '@use-voltra/android',
    `module.exports = {
  renderAndroidWidgetToString(variants) {
    return JSON.stringify({ kind: 'legacy', variants })
  },
  renderAndroidVariantToJson(element) {
    return { kind: 'dynamic', element }
  },
}
`
  )
  fs.mkdirSync(path.dirname(legacyStatePath), { recursive: true })
  fs.writeFileSync(legacyStatePath, `module.exports = { small: { title: 'Legacy' } }\n`)
  fs.writeFileSync(
    dynamicEntryPath,
    `module.exports = function Widget(_props, env) {
  return { family: env.widgetFamily, label: env.configuration ?? null }
}
`
  )

  const result = await generateAndroidFiles({
    projectRoot: tempDir,
    android: {
      enableNotifications: false,
      fonts: [],
      project: {},
      userImagesPath: path.join(tempDir, 'assets', 'voltra-android'),
      widgets: [
        {
          id: 'legacy',
          displayName: 'Legacy',
          description: 'Server rendered',
          targetCellWidth: 2,
          targetCellHeight: 2,
          initialStatePath: legacyStatePath,
        },
        {
          id: 'dynamic',
          displayName: 'Dynamic',
          description: 'Client rendered',
          targetCellWidth: 2,
          targetCellHeight: 2,
          entry: 'widgets/dynamic.js',
          appIntent: {
            parameters: [{ name: 'label', title: 'Label', default: 'Hello' }],
          },
        },
      ],
    },
    discovery: {
      androidRoot: path.join(tempDir, 'android'),
      appModuleName: 'app',
      appModuleRoot,
      manifestPath: path.join(resourceRoot, 'AndroidManifest.xml'),
      buildGradlePath: path.join(appModuleRoot, 'build.gradle'),
      packageName: 'com.example.app',
    },
  })

  const manifest = JSON.parse(fs.readFileSync(path.join(tempDir, '.voltra', 'manifest.android.json'), 'utf8'))
  assert.deepEqual(manifest, {
    version: 1,
    platform: 'android',
    widgets: [{ id: 'dynamic', entry: 'widgets/dynamic.js' }],
  })

  const receiver = fs.readFileSync(
    path.join(resourceRoot, 'java', 'com', 'example', 'app', 'widget', 'VoltraWidget_dynamicReceiver.kt'),
    'utf8'
  )
  assert.match(receiver, /VoltraClientWidgetReceiver/)

  const defaults = JSON.parse(
    fs.readFileSync(path.join(resourceRoot, 'assets', 'voltra', 'widget_config_defaults.json'), 'utf8')
  )
  assert.deepEqual(defaults, { dynamic: { label: 'Hello' } })

  const initialStates = JSON.parse(
    fs.readFileSync(path.join(resourceRoot, 'assets', 'voltra_initial_states.json'), 'utf8')
  )
  assert.ok(initialStates.legacy)
  assert.ok(initialStates.dynamic)
  assert.ok(result.files.includes('.voltra/manifest.android.json'))
})

test('Dynamic Widget entry must default-export a function or component', async () => {
  const { generateIOSFiles } = loadCliModule()
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'voltra-cli-test-'))
  const iosRoot = path.join(tempDir, 'ios')
  const infoPlistPath = path.join(iosRoot, 'TestApp', 'Info.plist')

  fs.writeFileSync(path.join(tempDir, 'package.json'), `${JSON.stringify({ private: true }, null, 2)}\n`)
  writeFakeBabelConfig(tempDir)
  writeFakeModule(
    tempDir,
    '@use-voltra/ios',
    `module.exports = {
  renderWidgetToString(variants) {
    return JSON.stringify(variants)
  },
  renderVoltraVariantToJson(element) {
    return element
  },
}
`
  )
  fs.mkdirSync(path.join(tempDir, 'widgets'), { recursive: true })
  fs.writeFileSync(path.join(tempDir, 'widgets', 'bad.js'), 'module.exports = { nope: true }\n')
  writeInfoPlist(infoPlistPath)

  await assert.rejects(
    () =>
      generateIOSFiles({
        projectRoot: tempDir,
        ios: {
          enablePushNotifications: false,
          deploymentTarget: '17.0',
          fonts: [],
          project: {},
          userImagesPath: path.join(tempDir, 'assets', 'voltra'),
          widgets: [
            {
              id: 'bad',
              displayName: 'Bad',
              description: 'Broken',
              supportedFamilies: ['systemSmall'],
              entry: 'widgets/bad.js',
            },
          ],
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
      }),
    /\[voltra\] Dynamic Widget "bad" at widgets\/bad\.js must default-export a function or component\./
  )
})

test('ensureAndroidGradleWidgetBundling appends release bundling snippet once', async () => {
  const { ensureAndroidGradleWidgetBundling } = loadCliModule()
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'voltra-cli-test-'))
  const appModuleRoot = path.join(tempDir, 'android', 'app')
  const buildGradlePath = path.join(appModuleRoot, 'build.gradle')

  fs.mkdirSync(appModuleRoot, { recursive: true })
  fs.writeFileSync(buildGradlePath, 'android {\n}\n')

  const options = {
    projectRoot: tempDir,
    discovery: {
      androidRoot: path.join(tempDir, 'android'),
      appModuleName: 'app',
      appModuleRoot,
      manifestPath: path.join(appModuleRoot, 'src', 'main', 'AndroidManifest.xml'),
      buildGradlePath,
      packageName: 'com.example.app',
    },
    hasDynamicWidgets: true,
  }

  const first = await ensureAndroidGradleWidgetBundling(options)
  const second = await ensureAndroidGradleWidgetBundling(options)
  const removed = await ensureAndroidGradleWidgetBundling({
    ...options,
    hasDynamicWidgets: false,
  })
  const gradle = fs.readFileSync(buildGradlePath, 'utf8')

  assert.equal(first.change.kind, 'updated')
  assert.equal(second.change, undefined)
  assert.equal(removed.change.kind, 'updated')
  assert.equal(gradle.split('@voltra-widget-bundling').length - 1, 0)
})

test('ensureAndroidGradleWidgetBundling removes exact legacy generated block', async () => {
  const { addDynamicWidgetBundlingSnippet, ensureAndroidGradleWidgetBundling } = loadCliModule()
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'voltra-cli-test-'))
  const appModuleRoot = path.join(tempDir, 'android', 'app')
  const buildGradlePath = path.join(appModuleRoot, 'build.gradle')
  const projectRootRelativeToAppModule = path.relative(appModuleRoot, tempDir).replace(/\\/g, '/')

  fs.mkdirSync(appModuleRoot, { recursive: true })
  const managed = addDynamicWidgetBundlingSnippet('android {\n}\n', projectRootRelativeToAppModule)
  fs.writeFileSync(buildGradlePath, managed.replace('\n// @voltra-widget-bundling-end', ''))

  await ensureAndroidGradleWidgetBundling({
    projectRoot: tempDir,
    discovery: {
      androidRoot: path.join(tempDir, 'android'),
      appModuleName: 'app',
      appModuleRoot,
      manifestPath: path.join(appModuleRoot, 'src', 'main', 'AndroidManifest.xml'),
      buildGradlePath,
      packageName: 'com.example.app',
    },
    hasDynamicWidgets: false,
  })

  const gradle = fs.readFileSync(buildGradlePath, 'utf8')
  assert.equal(gradle, 'android {\n}\n')
})

test('ensureAndroidGradleWidgetBundling writes relative project path in snippet', async () => {
  const { ensureAndroidGradleWidgetBundling } = loadCliModule()
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'voltra-cli-test-'))
  const appModuleRoot = path.join(tempDir, 'android', 'app')
  const buildGradlePath = path.join(appModuleRoot, 'build.gradle')

  fs.mkdirSync(appModuleRoot, { recursive: true })
  fs.writeFileSync(buildGradlePath, 'android {\n}\n')

  await ensureAndroidGradleWidgetBundling({
    projectRoot: tempDir,
    discovery: {
      androidRoot: path.join(tempDir, 'android'),
      appModuleName: 'app',
      appModuleRoot,
      manifestPath: path.join(appModuleRoot, 'src', 'main', 'AndroidManifest.xml'),
      buildGradlePath,
      packageName: 'com.example.app',
    },
    hasDynamicWidgets: true,
  })

  const gradle = fs.readFileSync(buildGradlePath, 'utf8')
  assert.equal(gradle.split('\n// @voltra-widget-bundling\n').length - 1, 1)
  assert.equal(gradle.split('\n// @voltra-widget-bundling-end\n').length - 1, 1)
  assert.match(gradle, /file\("\.\.\/\.\."\)/)
})

test('ensureAndroidGradleWidgetBundling preserves user content after unknown legacy marker block', async () => {
  const { ensureAndroidGradleWidgetBundling } = loadCliModule()
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'voltra-cli-test-'))
  const appModuleRoot = path.join(tempDir, 'android', 'app')
  const buildGradlePath = path.join(appModuleRoot, 'build.gradle')

  fs.mkdirSync(appModuleRoot, { recursive: true })
  fs.writeFileSync(
    buildGradlePath,
    `android {\n}\n\n// @voltra-widget-bundling\nunknown old block\ncustomTrailingConfig()\n`
  )

  const result = await ensureAndroidGradleWidgetBundling({
    projectRoot: tempDir,
    discovery: {
      androidRoot: path.join(tempDir, 'android'),
      appModuleName: 'app',
      appModuleRoot,
      manifestPath: path.join(appModuleRoot, 'src', 'main', 'AndroidManifest.xml'),
      buildGradlePath,
      packageName: 'com.example.app',
    },
    hasDynamicWidgets: false,
  })

  const gradle = fs.readFileSync(buildGradlePath, 'utf8')
  assert.equal(gradle, `android {\n}\n\n// @voltra-widget-bundling\nunknown old block\ncustomTrailingConfig()\n`)
  assert.match(result.warnings[0], /Preserved trailing Gradle content/)
})
