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

function loadAndroidWidgetSizingModule() {
  return require(path.join(packageRoot, 'build/cjs/platforms/android/widgetSizing.js'))
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
      buildConfigurationNames: ['Release', 'Debug'],
      infoPlistPaths: [path.join(iosRoot, 'TestApp', 'Info.plist')],
      entitlementsPaths: [],
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
      buildConfigurationNames: ['Release', 'Debug'],
      infoPlistPaths: [infoPlistPath],
      entitlementsPaths: [],
    },
  })

  assert.equal(result.changes.length, 1)
  assert.equal(result.changes[0].kind, 'created')
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
      buildConfigurationNames: ['Release', 'Debug'],
      infoPlistPaths: [infoPlistPath],
      entitlementsPaths: [],
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
          buildConfigurationNames: ['Release', 'Debug'],
          infoPlistPaths: [infoPlistPath],
          entitlementsPaths: [],
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

function writeEntitlements(filePath, body = '') {
  fs.mkdirSync(path.dirname(filePath), { recursive: true })
  fs.writeFileSync(
    filePath,
    `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>${body}</dict>
</plist>
`
  )
}

const MULTI_CONFIGURATION_NAMES = ['Debug', 'Staging', 'Release']

const MULTI_CONFIGURATION_TARGET_SETTINGS = {
  Debug: {
    bundleIdentifier: 'com.example.app.dev',
    entitlements: 'TestApp/TestAppDebug.entitlements',
    infoPlist: 'TestApp/Info-Debug.plist',
    profile: 'Dev Profile',
  },
  Staging: {
    bundleIdentifier: 'com.example.app.staging',
    entitlements: 'TestApp/TestAppStaging.entitlements',
    infoPlist: 'TestApp/Info.plist',
    profile: 'Staging Profile',
  },
  Release: {
    bundleIdentifier: 'com.example.app',
    entitlements: 'TestApp/TestApp.entitlements',
    infoPlist: 'TestApp/Info.plist',
    profile: 'Release Profile',
  },
}

function buildMultiConfigurationPbxproj(options = {}) {
  const { configurationNames = MULTI_CONFIGURATION_NAMES, targetSettingsOverrides = {}, projectSettings = {} } = options
  const targetConfigurationIds = {
    Debug: 'AA00000000000000000001',
    Staging: 'AA00000000000000000002',
    Release: 'AA00000000000000000003',
  }
  const projectConfigurationIds = {
    Debug: 'BB00000000000000000001',
    Staging: 'BB00000000000000000002',
    Release: 'BB00000000000000000003',
  }

  const targetConfigurations = configurationNames.map((name) => {
    const settings = MULTI_CONFIGURATION_TARGET_SETTINGS[name]
    const defaultSettings = {
      CODE_SIGN_STYLE: 'Manual',
      CODE_SIGN_ENTITLEMENTS: settings.entitlements,
      DEVELOPMENT_TEAM: 'ABCDE12345',
      INFOPLIST_FILE: settings.infoPlist,
      IPHONEOS_DEPLOYMENT_TARGET: '15.1',
      PRODUCT_BUNDLE_IDENTIFIER: settings.bundleIdentifier,
      PRODUCT_NAME: 'TestApp',
      PROVISIONING_PROFILE_SPECIFIER: `"${settings.profile}"`,
    }
    const buildSettings = { ...defaultSettings, ...(targetSettingsOverrides[name] ?? {}) }

    return [
      `\t\t${targetConfigurationIds[name]} /* ${name} */ = {`,
      '\t\t\tisa = XCBuildConfiguration;',
      '\t\t\tbuildSettings = {',
      ...Object.entries(buildSettings)
        .filter(([, value]) => value !== undefined)
        .map(([key, value]) => `\t\t\t\t${key} = ${value};`),
      '\t\t\t};',
      `\t\t\tname = ${name};`,
      '\t\t};',
    ].join('\n')
  })

  const projectConfigurations = configurationNames.map((name) =>
    [
      `\t\t${projectConfigurationIds[name]} /* ${name} */ = {`,
      '\t\t\tisa = XCBuildConfiguration;',
      '\t\t\tbuildSettings = {',
      '\t\t\t\tIPHONEOS_DEPLOYMENT_TARGET = 15.1;',
      '\t\t\t\tSDKROOT = iphoneos;',
      ...Object.entries(projectSettings[name] ?? {}).map(([key, value]) => `\t\t\t\t${key} = ${value};`),
      '\t\t\t};',
      `\t\t\tname = ${name};`,
      '\t\t};',
    ].join('\n')
  )

  const configurationListEntry = (id, label, ids) =>
    [
      `\t\t${id} /* Build configuration list for ${label} */ = {`,
      '\t\t\tisa = XCConfigurationList;',
      '\t\t\tbuildConfigurations = (',
      ...configurationNames.map((name) => `\t\t\t\t${ids[name]} /* ${name} */,`),
      '\t\t\t);',
      '\t\t\tdefaultConfigurationIsVisible = 0;',
      '\t\t\tdefaultConfigurationName = Release;',
      '\t\t};',
    ].join('\n')

  return `// !$*UTF8*$!
{
\tarchiveVersion = 1;
\tclasses = {
\t};
\tobjectVersion = 54;
\tobjects = {

/* Begin PBXFileReference section */
\t\t13B07F961A680F5B00A75B9A /* TestApp.app */ = {isa = PBXFileReference; explicitFileType = wrapper.application; includeInIndex = 0; path = TestApp.app; sourceTree = BUILT_PRODUCTS_DIR; };
/* End PBXFileReference section */

/* Begin PBXFrameworksBuildPhase section */
\t\t13B07F8C1A680F5B00A75B9A /* Frameworks */ = {
\t\t\tisa = PBXFrameworksBuildPhase;
\t\t\tbuildActionMask = 2147483647;
\t\t\tfiles = (
\t\t\t);
\t\t\trunOnlyForDeploymentPostprocessing = 0;
\t\t};
/* End PBXFrameworksBuildPhase section */

/* Begin PBXGroup section */
\t\t83CBB9F61A601CBA00E9B192 = {
\t\t\tisa = PBXGroup;
\t\t\tchildren = (
\t\t\t\t83CBBA001A601CBA00E9B192 /* Products */,
\t\t\t\t83CBBA011A601CBA00E9B192 /* Frameworks */,
\t\t\t);
\t\t\tsourceTree = "<group>";
\t\t};
\t\t83CBBA011A601CBA00E9B192 /* Frameworks */ = {
\t\t\tisa = PBXGroup;
\t\t\tchildren = (
\t\t\t);
\t\t\tname = Frameworks;
\t\t\tsourceTree = "<group>";
\t\t};
\t\t83CBBA001A601CBA00E9B192 /* Products */ = {
\t\t\tisa = PBXGroup;
\t\t\tchildren = (
\t\t\t\t13B07F961A680F5B00A75B9A /* TestApp.app */,
\t\t\t);
\t\t\tname = Products;
\t\t\tsourceTree = "<group>";
\t\t};
/* End PBXGroup section */

/* Begin PBXNativeTarget section */
\t\t13B07F861A680F5B00A75B9A /* TestApp */ = {
\t\t\tisa = PBXNativeTarget;
\t\t\tbuildConfigurationList = CC00000000000000000001 /* Build configuration list for PBXNativeTarget "TestApp" */;
\t\t\tbuildPhases = (
\t\t\t\t13B07F871A680F5B00A75B9A /* Sources */,
\t\t\t\t13B07F8C1A680F5B00A75B9A /* Frameworks */,
\t\t\t\t13B07F8E1A680F5B00A75B9A /* Resources */,
\t\t\t);
\t\t\tbuildRules = (
\t\t\t);
\t\t\tdependencies = (
\t\t\t);
\t\t\tname = TestApp;
\t\t\tproductName = TestApp;
\t\t\tproductReference = 13B07F961A680F5B00A75B9A /* TestApp.app */;
\t\t\tproductType = "com.apple.product-type.application";
\t\t};
/* End PBXNativeTarget section */

/* Begin PBXProject section */
\t\t83CBB9F71A601CBA00E9B192 /* Project object */ = {
\t\t\tisa = PBXProject;
\t\t\tattributes = {
\t\t\t\tLastUpgradeCheck = 1210;
\t\t\t\tTargetAttributes = {
\t\t\t\t};
\t\t\t};
\t\t\tbuildConfigurationList = CC00000000000000000002 /* Build configuration list for PBXProject "TestApp" */;
\t\t\tcompatibilityVersion = "Xcode 12.0";
\t\t\tdevelopmentRegion = en;
\t\t\thasScannedForEncodings = 0;
\t\t\tknownRegions = (
\t\t\t\ten,
\t\t\t\tBase,
\t\t\t);
\t\t\tmainGroup = 83CBB9F61A601CBA00E9B192;
\t\t\tproductRefGroup = 83CBBA001A601CBA00E9B192 /* Products */;
\t\t\tprojectDirPath = "";
\t\t\tprojectRoot = "";
\t\t\ttargets = (
\t\t\t\t13B07F861A680F5B00A75B9A /* TestApp */,
\t\t\t);
\t\t};
/* End PBXProject section */

/* Begin PBXResourcesBuildPhase section */
\t\t13B07F8E1A680F5B00A75B9A /* Resources */ = {
\t\t\tisa = PBXResourcesBuildPhase;
\t\t\tbuildActionMask = 2147483647;
\t\t\tfiles = (
\t\t\t);
\t\t\trunOnlyForDeploymentPostprocessing = 0;
\t\t};
/* End PBXResourcesBuildPhase section */

/* Begin PBXSourcesBuildPhase section */
\t\t13B07F871A680F5B00A75B9A /* Sources */ = {
\t\t\tisa = PBXSourcesBuildPhase;
\t\t\tbuildActionMask = 2147483647;
\t\t\tfiles = (
\t\t\t);
\t\t\trunOnlyForDeploymentPostprocessing = 0;
\t\t};
/* End PBXSourcesBuildPhase section */

/* Begin XCBuildConfiguration section */
${[...targetConfigurations, ...projectConfigurations].join('\n')}
/* End XCBuildConfiguration section */

/* Begin XCConfigurationList section */
${configurationListEntry('CC00000000000000000001', 'PBXNativeTarget "TestApp"', targetConfigurationIds)}
${configurationListEntry('CC00000000000000000002', 'PBXProject "TestApp"', projectConfigurationIds)}
/* End XCConfigurationList section */
\t};
\trootObject = 83CBB9F71A601CBA00E9B192 /* Project object */;
}
`
}

function writeMultiConfigurationIosProject(options = {}) {
  const tempDir = options.tempDir ?? fs.mkdtempSync(path.join(os.tmpdir(), 'voltra-cli-test-'))
  const iosRoot = path.join(tempDir, 'ios')
  const pbxprojPath = path.join(iosRoot, 'TestApp.xcodeproj', 'project.pbxproj')

  fs.mkdirSync(path.dirname(pbxprojPath), { recursive: true })
  fs.writeFileSync(pbxprojPath, buildMultiConfigurationPbxproj(options))
  fs.writeFileSync(path.join(iosRoot, 'Podfile'), "platform :ios, '15.1'\n")

  for (const name of options.configurationNames ?? MULTI_CONFIGURATION_NAMES) {
    const settings = MULTI_CONFIGURATION_TARGET_SETTINGS[name]
    writeEntitlements(path.join(iosRoot, settings.entitlements))
    writeInfoPlist(path.join(iosRoot, settings.infoPlist))
  }

  return { tempDir, iosRoot, pbxprojPath }
}

function readWidgetConfigurationList(pbxprojPath) {
  const match = fs
    .readFileSync(pbxprojPath, 'utf8')
    .match(/Build configuration list for PBXNativeTarget "TestAppLiveActivity" \*\/ = \{[\s\S]*?\n\t\t\};/)

  assert.ok(match, 'expected the widget target to have a build configuration list')
  return match[0]
}

/** Rewrites the build settings of the app target's own build configurations, in place. */
function editAppBuildConfigurations(pbxprojPath, edit) {
  const content = fs.readFileSync(pbxprojPath, 'utf8')
  const next = content.replace(/(AA[0-9]{20} \/\* \w+ \*\/ = \{)([\s\S]*?)(\n\t\t\};)/g, (match, head, body, tail) => {
    return `${head}${edit(body)}${tail}`
  })

  assert.notEqual(next, content, 'expected the app build configurations to change')
  fs.writeFileSync(pbxprojPath, next)
}

/** Adds a build configuration to the app target of an existing project, as Xcode would. */
function addAppBuildConfiguration(pbxprojPath, name, buildSettings) {
  const id = `AA0000000000000000000${name.length}`
  const entry = [
    `\t\t${id} /* ${name} */ = {`,
    '\t\t\tisa = XCBuildConfiguration;',
    '\t\t\tbuildSettings = {',
    ...Object.entries(buildSettings).map(([key, value]) => `\t\t\t\t${key} = ${value};`),
    '\t\t\t};',
    `\t\t\tname = ${name};`,
    '\t\t};',
  ].join('\n')

  const content = fs.readFileSync(pbxprojPath, 'utf8')
  const withEntry = content.replace(/(\/\* Begin XCBuildConfiguration section \*\/\n)/, `$1${entry}\n`)
  const withReference = withEntry.replace(
    /(Build configuration list for PBXNativeTarget "TestApp" \*\/ = \{[\s\S]*?buildConfigurations = \(\n)/,
    `$1\t\t\t\t${id} /* ${name} */,\n`
  )

  assert.notEqual(withReference, content, `expected to add the ${name} build configuration`)
  fs.writeFileSync(pbxprojPath, withReference)
}

function multiConfigurationIosConfig(overrides = {}) {
  return {
    enablePushNotifications: false,
    deploymentTarget: '16.2',
    fonts: [],
    project: {},
    userImagesPath: '/tmp/voltra-user-images',
    widgets: [],
    ...overrides,
  }
}

test('iOS discovery reports every entitlements file and Info.plist across build configurations', async () => {
  const { discoverIOSProject } = loadCliModule()
  const { tempDir, iosRoot } = writeMultiConfigurationIosProject()

  const discovery = await discoverIOSProject(tempDir, {})

  assert.deepEqual(discovery.entitlementsPaths, [
    path.join(iosRoot, 'TestApp', 'TestApp.entitlements'),
    path.join(iosRoot, 'TestApp', 'TestAppDebug.entitlements'),
    path.join(iosRoot, 'TestApp', 'TestAppStaging.entitlements'),
  ])
  assert.deepEqual(discovery.infoPlistPaths, [
    path.join(iosRoot, 'TestApp', 'Info.plist'),
    path.join(iosRoot, 'TestApp', 'Info-Debug.plist'),
  ])
  assert.equal(discovery.entitlementsPath, path.join(iosRoot, 'TestApp', 'TestApp.entitlements'))
  assert.equal(discovery.infoPlistPath, path.join(iosRoot, 'TestApp', 'Info.plist'))
})

test('ensureEntitlements writes the app group into every build configuration entitlements file', async () => {
  const { discoverIOSProject, ensureEntitlements } = loadCliModule()
  const { tempDir, iosRoot } = writeMultiConfigurationIosProject()
  const discovery = await discoverIOSProject(tempDir, {})

  const result = await ensureEntitlements({
    projectRoot: tempDir,
    ios: multiConfigurationIosConfig({ groupIdentifier: 'group.com.example.app' }),
    discovery,
  })

  assert.equal(result.changes.length, 3)

  for (const name of MULTI_CONFIGURATION_NAMES) {
    const entitlements = fs.readFileSync(
      path.join(iosRoot, MULTI_CONFIGURATION_TARGET_SETTINGS[name].entitlements),
      'utf8'
    )
    assert.match(entitlements, /group\.com\.example\.app/)
  }
})

test('ensureInfoPlist writes Voltra keys into every build configuration Info.plist', async () => {
  const { discoverIOSProject, ensureInfoPlist } = loadCliModule()
  const { tempDir, iosRoot } = writeMultiConfigurationIosProject()
  const discovery = await discoverIOSProject(tempDir, {})

  const result = await ensureInfoPlist({
    projectRoot: tempDir,
    ios: multiConfigurationIosConfig({ groupIdentifier: 'group.com.example.app' }),
    discovery,
  })

  assert.equal(result.changes.length, 2)

  for (const infoPlist of ['Info.plist', 'Info-Debug.plist']) {
    const content = fs.readFileSync(path.join(iosRoot, 'TestApp', infoPlist), 'utf8')
    assert.match(content, /Voltra_AppGroupIdentifier/)
    assert.match(content, /group\.com\.example\.app/)
  }
})

test('ensureIOSWidgetTarget matches the widget to each build configuration of the app', async () => {
  const { discoverIOSProject, ensureIOSWidgetTarget } = loadCliModule()
  const { tempDir, pbxprojPath } = writeMultiConfigurationIosProject()
  const discovery = await discoverIOSProject(tempDir, {})

  await ensureIOSWidgetTarget({
    projectRoot: tempDir,
    ios: multiConfigurationIosConfig({ groupIdentifier: 'group.com.example.app' }),
    discovery,
    generatedFiles: [],
  })

  const pbxproj = fs.readFileSync(pbxprojPath, 'utf8')

  for (const name of MULTI_CONFIGURATION_NAMES) {
    const settings = MULTI_CONFIGURATION_TARGET_SETTINGS[name]

    assert.ok(
      pbxproj.includes(`PRODUCT_BUNDLE_IDENTIFIER = "${settings.bundleIdentifier}.TestAppLiveActivity"`) ||
        pbxproj.includes(`PRODUCT_BUNDLE_IDENTIFIER = ${settings.bundleIdentifier}.TestAppLiveActivity;`),
      `expected a widget bundle identifier for ${name}`
    )
    assert.ok(
      pbxproj.includes(`CODE_SIGN_ENTITLEMENTS = ${settings.entitlements};`) ||
        pbxproj.includes(`CODE_SIGN_ENTITLEMENTS = "${settings.entitlements}"`),
      `expected ${name} to keep its own entitlements file`
    )
  }

  const provisioningProfiles = [...pbxproj.matchAll(/PROVISIONING_PROFILE_SPECIFIER = "([^"]+)"/g)].map(
    (match) => match[1]
  )

  for (const name of MULTI_CONFIGURATION_NAMES) {
    const expectedProfile = MULTI_CONFIGURATION_TARGET_SETTINGS[name].profile
    assert.equal(
      provisioningProfiles.filter((profile) => profile === expectedProfile).length,
      2,
      `expected the app and the widget to share the ${name} provisioning profile`
    )
  }
})

test('a bundle identifier composed from a build setting is kept unexpanded for the widget', async () => {
  const { discoverIOSProject, ensureIOSWidgetTarget } = loadCliModule()
  const { tempDir, pbxprojPath } = writeMultiConfigurationIosProject({
    targetSettingsOverrides: {
      Debug: { PRODUCT_BUNDLE_IDENTIFIER: '"com.example.app$(BUNDLE_SUFFIX)"' },
      Staging: { PRODUCT_BUNDLE_IDENTIFIER: '"com.example.app$(BUNDLE_SUFFIX)"' },
      Release: { PRODUCT_BUNDLE_IDENTIFIER: '"com.example.app$(BUNDLE_SUFFIX)"' },
    },
    projectSettings: {
      Debug: { BUNDLE_SUFFIX: '.dev' },
      Staging: { BUNDLE_SUFFIX: '.staging' },
      Release: { BUNDLE_SUFFIX: '""' },
    },
  })
  const discovery = await discoverIOSProject(tempDir, {})

  await ensureIOSWidgetTarget({
    projectRoot: tempDir,
    ios: multiConfigurationIosConfig({ groupIdentifier: 'group.com.example.app' }),
    discovery,
    generatedFiles: [],
  })

  const pbxproj = fs.readFileSync(pbxprojPath, 'utf8')

  // Xcode expands the setting per build; resolving it here would collapse it to the same
  // identifier for every configuration and break the app/extension identifier prefix rule.
  assert.match(pbxproj, /PRODUCT_BUNDLE_IDENTIFIER = "com\.example\.app\$\(BUNDLE_SUFFIX\)\.TestAppLiveActivity"/)
  assert.doesNotMatch(pbxproj, /PRODUCT_BUNDLE_IDENTIFIER = "?com\.example\.app\.TestAppLiveActivity"?;/)
})

test('a build configuration added to the app after the widget exists is mirrored onto the widget', async () => {
  const { discoverIOSProject, ensureIOSWidgetTarget } = loadCliModule()
  const { tempDir, iosRoot, pbxprojPath } = writeMultiConfigurationIosProject()
  const ios = multiConfigurationIosConfig({ groupIdentifier: 'group.com.example.app' })

  await ensureIOSWidgetTarget({
    projectRoot: tempDir,
    ios,
    discovery: await discoverIOSProject(tempDir, {}),
    generatedFiles: [],
  })

  // The team adds a Preview environment to the existing project, then reapplies.
  writeEntitlements(path.join(iosRoot, 'TestApp', 'TestAppPreview.entitlements'))
  addAppBuildConfiguration(pbxprojPath, 'Preview', {
    CODE_SIGN_ENTITLEMENTS: 'TestApp/TestAppPreview.entitlements',
    INFOPLIST_FILE: 'TestApp/Info.plist',
    PRODUCT_BUNDLE_IDENTIFIER: 'com.example.app.preview',
    PRODUCT_NAME: 'TestApp',
  })

  await ensureIOSWidgetTarget({
    projectRoot: tempDir,
    ios,
    discovery: await discoverIOSProject(tempDir, {}),
    generatedFiles: [],
  })

  const widgetConfigurationList = readWidgetConfigurationList(pbxprojPath)

  for (const name of [...MULTI_CONFIGURATION_NAMES, 'Preview']) {
    assert.ok(
      widgetConfigurationList.includes(`/* ${name} */`),
      `expected the widget to have a ${name} build configuration`
    )
  }
})

test('signing settings the app no longer sets are dropped from the widget', async () => {
  const { discoverIOSProject, ensureIOSWidgetTarget } = loadCliModule()
  const { tempDir, pbxprojPath } = writeMultiConfigurationIosProject()
  const ios = multiConfigurationIosConfig({ groupIdentifier: 'group.com.example.app' })

  await ensureIOSWidgetTarget({
    projectRoot: tempDir,
    ios,
    discovery: await discoverIOSProject(tempDir, {}),
    generatedFiles: [],
  })

  assert.match(fs.readFileSync(pbxprojPath, 'utf8'), /PROVISIONING_PROFILE_SPECIFIER = "Dev Profile"/)

  // The app switches to automatic signing in the existing project, then reapplies.
  editAppBuildConfigurations(pbxprojPath, (buildSettings) =>
    buildSettings
      .replace(/\n\t+CODE_SIGN_STYLE = Manual;/g, '\n\t\t\t\tCODE_SIGN_STYLE = Automatic;')
      .replace(/\n\t+DEVELOPMENT_TEAM = [^;]+;/g, '')
      .replace(/\n\t+PROVISIONING_PROFILE_SPECIFIER = [^;]+;/g, '')
  )

  await ensureIOSWidgetTarget({
    projectRoot: tempDir,
    ios,
    discovery: await discoverIOSProject(tempDir, {}),
    generatedFiles: [],
  })

  const pbxproj = fs.readFileSync(pbxprojPath, 'utf8')
  assert.doesNotMatch(pbxproj, /PROVISIONING_PROFILE_SPECIFIER/)
  assert.doesNotMatch(pbxproj, /DEVELOPMENT_TEAM/)
})

test('build configurations disagreeing on the app version are reported', async () => {
  const { discoverIOSProject, generateIOSFiles } = loadCliModule()
  const { tempDir, iosRoot } = writeMultiConfigurationIosProject()

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

  fs.writeFileSync(
    path.join(iosRoot, 'TestApp', 'Info-Debug.plist'),
    `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>CFBundleShortVersionString</key>
  <string>9.9.9</string>
  <key>CFBundleVersion</key>
  <string>999</string>
</dict>
</plist>
`
  )

  const result = await generateIOSFiles({
    projectRoot: tempDir,
    ios: multiConfigurationIosConfig({ groupIdentifier: 'group.com.example.app' }),
    discovery: await discoverIOSProject(tempDir, {}),
  })

  assert.ok(
    result.warnings.some((warning) => warning.includes('9.9.9') && warning.includes('1.2.3')),
    `expected a version divergence warning, got: ${JSON.stringify(result.warnings)}`
  )
})

test('a bundle identifier naming the target is resolved against the app, not the widget', async () => {
  const { discoverIOSProject, ensureIOSWidgetTarget } = loadCliModule()
  // The React Native template ships exactly this shape.
  const templateIdentifier = '"org.reactjs.native.example.$(PRODUCT_NAME:rfc1034identifier)"'
  const { tempDir, pbxprojPath } = writeMultiConfigurationIosProject({
    targetSettingsOverrides: {
      Debug: { PRODUCT_BUNDLE_IDENTIFIER: templateIdentifier },
      Staging: { PRODUCT_BUNDLE_IDENTIFIER: templateIdentifier },
      Release: { PRODUCT_BUNDLE_IDENTIFIER: templateIdentifier },
    },
  })
  const discovery = await discoverIOSProject(tempDir, {})

  await ensureIOSWidgetTarget({
    projectRoot: tempDir,
    ios: multiConfigurationIosConfig({ groupIdentifier: 'group.com.example.app' }),
    discovery,
    generatedFiles: [],
  })

  const pbxproj = fs.readFileSync(pbxprojPath, 'utf8')

  // PRODUCT_NAME is the widget's own name inside the widget target, so leaving the reference
  // unexpanded would stop the extension being a child of the app's identifier.
  assert.match(pbxproj, /PRODUCT_BUNDLE_IDENTIFIER = "?org\.reactjs\.native\.example\.TestApp\.TestAppLiveActivity"?;/)
  // The app target keeps its own reference untouched; only the widget's copy is resolved.
  assert.match(
    pbxproj,
    /PRODUCT_BUNDLE_IDENTIFIER = "org\.reactjs\.native\.example\.\$\(PRODUCT_NAME:rfc1034identifier\)";/
  )
  assert.doesNotMatch(pbxproj, /\$\(PRODUCT_NAME:rfc1034identifier\)\.TestAppLiveActivity/)
})

test('per-build-configuration values become build settings the app and widget both inherit', async () => {
  const { discoverIOSProject, ensureIOSWidgetTarget, ensureEntitlements, resolveIOSBuildConfigurationValues } =
    loadCliModule()
  const { tempDir, iosRoot, pbxprojPath } = writeMultiConfigurationIosProject()
  const discovery = await discoverIOSProject(tempDir, {})

  const { ios, buildSettings } = resolveIOSBuildConfigurationValues(
    multiConfigurationIosConfig({
      groupIdentifier: {
        Debug: 'group.com.example.app.dev',
        Staging: 'group.com.example.app.staging',
        Release: 'group.com.example.app',
      },
    }),
    discovery
  )

  assert.equal(ios.groupIdentifier, '$(VOLTRA_APP_GROUP_IDENTIFIER)')
  assert.deepEqual(buildSettings.get('Debug'), { VOLTRA_APP_GROUP_IDENTIFIER: 'group.com.example.app.dev' })

  await ensureEntitlements({ projectRoot: tempDir, ios, discovery })
  await ensureIOSWidgetTarget({ projectRoot: tempDir, ios, discovery, generatedFiles: [], buildSettings })

  const entitlements = fs.readFileSync(path.join(iosRoot, 'TestApp', 'TestAppDebug.entitlements'), 'utf8')
  assert.match(entitlements, /\$\(VOLTRA_APP_GROUP_IDENTIFIER\)/)

  const pbxproj = fs.readFileSync(pbxprojPath, 'utf8')
  assert.match(pbxproj, /VOLTRA_APP_GROUP_IDENTIFIER = "?group\.com\.example\.app\.dev"?;/)
  assert.match(pbxproj, /VOLTRA_APP_GROUP_IDENTIFIER = "?group\.com\.example\.app\.staging"?;/)
  assert.match(pbxproj, /VOLTRA_APP_GROUP_IDENTIFIER = "?group\.com\.example\.app"?;/)
})

test('a plain string value writes no build settings', async () => {
  const { discoverIOSProject, resolveIOSBuildConfigurationValues } = loadCliModule()
  const { tempDir } = writeMultiConfigurationIosProject()
  const discovery = await discoverIOSProject(tempDir, {})

  const { ios, buildSettings } = resolveIOSBuildConfigurationValues(
    multiConfigurationIosConfig({ groupIdentifier: 'group.com.example.app' }),
    discovery
  )

  assert.equal(ios.groupIdentifier, 'group.com.example.app')
  assert.equal(buildSettings.size, 0)
})

test('build settings Voltra no longer defines are removed from the project', async () => {
  const { discoverIOSProject, ensureIOSWidgetTarget, resolveIOSBuildConfigurationValues } = loadCliModule()
  const { tempDir, pbxprojPath } = writeMultiConfigurationIosProject()

  const perConfigurationDiscovery = await discoverIOSProject(tempDir, {})
  const perConfiguration = resolveIOSBuildConfigurationValues(
    multiConfigurationIosConfig({
      groupIdentifier: {
        Debug: 'group.com.example.app.dev',
        Staging: 'group.com.example.app.staging',
        Release: 'group.com.example.app',
      },
    }),
    perConfigurationDiscovery
  )

  await ensureIOSWidgetTarget({
    projectRoot: tempDir,
    ios: perConfiguration.ios,
    discovery: perConfigurationDiscovery,
    generatedFiles: [],
    buildSettings: perConfiguration.buildSettings,
  })

  assert.match(fs.readFileSync(pbxprojPath, 'utf8'), /VOLTRA_APP_GROUP_IDENTIFIER/)

  const plainDiscovery = await discoverIOSProject(tempDir, {})
  const plain = resolveIOSBuildConfigurationValues(
    multiConfigurationIosConfig({ groupIdentifier: 'group.com.example.app' }),
    plainDiscovery
  )

  await ensureIOSWidgetTarget({
    projectRoot: tempDir,
    ios: plain.ios,
    discovery: plainDiscovery,
    generatedFiles: [],
    buildSettings: plain.buildSettings,
  })

  assert.doesNotMatch(fs.readFileSync(pbxprojPath, 'utf8'), /VOLTRA_APP_GROUP_IDENTIFIER/)
})

test('a value missing a build configuration is reported before the project is touched', async () => {
  const { discoverIOSProject, resolveIOSBuildConfigurationValues } = loadCliModule()
  const { tempDir } = writeMultiConfigurationIosProject()
  const discovery = await discoverIOSProject(tempDir, {})

  assert.throws(
    () =>
      resolveIOSBuildConfigurationValues(
        multiConfigurationIosConfig({
          groupIdentifier: { Debug: 'group.com.example.app.dev', Release: 'group.com.example.app' },
        }),
        discovery
      ),
    /ios\.groupIdentifier has no value for build configuration 'Staging'\. This project has: Release, Debug, Staging\./
  )
})

test('a value naming an unknown build configuration is reported', async () => {
  const { discoverIOSProject, resolveIOSBuildConfigurationValues } = loadCliModule()
  const { tempDir } = writeMultiConfigurationIosProject()
  const discovery = await discoverIOSProject(tempDir, {})

  assert.throws(
    () =>
      resolveIOSBuildConfigurationValues(
        multiConfigurationIosConfig({
          groupIdentifier: {
            Debug: 'group.com.example.app.dev',
            Staging: 'group.com.example.app.staging',
            Release: 'group.com.example.app',
            Preview: 'group.com.example.app.preview',
          },
        }),
        discovery
      ),
    /ios\.groupIdentifier names unknown build configurations: Preview\./
  )
})

test('an entitlements path per build configuration is applied to the Xcode project', async () => {
  const { discoverIOSProject, ensureEntitlements, ensureIOSWidgetTarget, resolveIOSBuildConfigurationValues } =
    loadCliModule()
  const { tempDir, iosRoot, pbxprojPath } = writeMultiConfigurationIosProject()
  const debugEntitlements = path.join(iosRoot, 'TestApp', 'Custom-Debug.entitlements')
  const releaseEntitlements = path.join(iosRoot, 'TestApp', 'Custom-Release.entitlements')
  writeEntitlements(debugEntitlements)
  writeEntitlements(releaseEntitlements)

  const entitlementsPath = {
    Debug: debugEntitlements,
    Staging: releaseEntitlements,
    Release: releaseEntitlements,
  }
  const discovery = await discoverIOSProject(tempDir, { entitlementsPath })

  assert.deepEqual(discovery.entitlementsPaths, [releaseEntitlements, debugEntitlements])

  const { ios, buildSettings } = resolveIOSBuildConfigurationValues(
    multiConfigurationIosConfig({
      groupIdentifier: 'group.com.example.app',
      project: { entitlementsPath },
    }),
    discovery
  )

  await ensureEntitlements({ projectRoot: tempDir, ios, discovery })
  await ensureIOSWidgetTarget({ projectRoot: tempDir, ios, discovery, generatedFiles: [], buildSettings })

  const pbxproj = fs.readFileSync(pbxprojPath, 'utf8')
  assert.match(pbxproj, /CODE_SIGN_ENTITLEMENTS = "?TestApp\/Custom-Debug\.entitlements"?;/)
  assert.match(pbxproj, /CODE_SIGN_ENTITLEMENTS = "?TestApp\/Custom-Release\.entitlements"?;/)

  for (const entitlements of [debugEntitlements, releaseEntitlements]) {
    assert.match(fs.readFileSync(entitlements, 'utf8'), /group\.com\.example\.app/)
  }
})

test('a build configuration the project-level list lacks still gets its value', async () => {
  const { discoverIOSProject, ensureIOSWidgetTarget, resolveIOSBuildConfigurationValues } = loadCliModule()
  const { tempDir, iosRoot, pbxprojPath } = writeMultiConfigurationIosProject()

  // Adding a configuration to a target without adding it project-wide is ordinary in Xcode.
  writeEntitlements(path.join(iosRoot, 'TestApp', 'TestAppPreview.entitlements'))
  addAppBuildConfiguration(pbxprojPath, 'Preview', {
    CODE_SIGN_ENTITLEMENTS: 'TestApp/TestAppPreview.entitlements',
    INFOPLIST_FILE: 'TestApp/Info.plist',
    PRODUCT_BUNDLE_IDENTIFIER: 'com.example.app.preview',
    PRODUCT_NAME: 'TestApp',
  })

  const discovery = await discoverIOSProject(tempDir, {})
  const { ios, buildSettings } = resolveIOSBuildConfigurationValues(
    multiConfigurationIosConfig({
      groupIdentifier: {
        Debug: 'group.com.example.app.dev',
        Staging: 'group.com.example.app.staging',
        Release: 'group.com.example.app',
        Preview: 'group.com.example.app.preview',
      },
    }),
    discovery
  )

  await ensureIOSWidgetTarget({ projectRoot: tempDir, ios, discovery, generatedFiles: [], buildSettings })

  // Without a value, $(VOLTRA_APP_GROUP_IDENTIFIER) expands to nothing and the App Group is empty.
  assert.match(
    fs.readFileSync(pbxprojPath, 'utf8'),
    /VOLTRA_APP_GROUP_IDENTIFIER = "?group\.com\.example\.app\.preview"?;/
  )
})

test('build settings Voltra does not own are left alone', async () => {
  const { discoverIOSProject, ensureIOSWidgetTarget, resolveIOSBuildConfigurationValues } = loadCliModule()
  const { tempDir, pbxprojPath } = writeMultiConfigurationIosProject({
    projectSettings: {
      Debug: { VOLTRA_API_URL: '"https://api.example.com"' },
    },
  })

  const discovery = await discoverIOSProject(tempDir, {})
  const { ios, buildSettings } = resolveIOSBuildConfigurationValues(
    multiConfigurationIosConfig({ groupIdentifier: 'group.com.example.app' }),
    discovery
  )

  await ensureIOSWidgetTarget({ projectRoot: tempDir, ios, discovery, generatedFiles: [], buildSettings })

  assert.match(fs.readFileSync(pbxprojPath, 'utf8'), /VOLTRA_API_URL = "?https:\/\/api\.example\.com"?;/)
})

// Bug report: on the reporter's Samsung phone one launcher grid cell measures 69dp wide, but on
// their Samsung tablet the same cell measures 111dp. The previous `cells * 70 - 30` formula gave a
// 2-cell width of 110dp, which fits inside a single tablet cell, so the widget was placed only
// 1 cell wide there even though it declared `targetCellWidth: 2`.
test('androidWidgetSizingAttributes always emits minWidth/minHeight so Android 11 and older place the widget correctly', () => {
  const { androidWidgetSizingAttributes } = loadAndroidWidgetSizingModule()

  assert.deepEqual(androidWidgetSizingAttributes({ targetCellWidth: 2, targetCellHeight: 2 }), [
    'android:minWidth="130dp"',
    'android:minHeight="117dp"',
    'android:targetCellWidth="2"',
    'android:targetCellHeight="2"',
  ])
})

test('androidWidgetSizingAttributes derives minWidth/minHeight from non-square targetCell dimensions', () => {
  const { androidWidgetSizingAttributes } = loadAndroidWidgetSizingModule()

  assert.deepEqual(androidWidgetSizingAttributes({ targetCellWidth: 3, targetCellHeight: 2 }), [
    'android:minWidth="203dp"',
    'android:minHeight="117dp"',
    'android:targetCellWidth="3"',
    'android:targetCellHeight="2"',
  ])
})

test('androidWidgetSizingAttributes derives minWidth/minHeight for a 1x1 widget', () => {
  const { androidWidgetSizingAttributes } = loadAndroidWidgetSizingModule()

  assert.deepEqual(androidWidgetSizingAttributes({ targetCellWidth: 1, targetCellHeight: 1 }), [
    'android:minWidth="57dp"',
    'android:minHeight="51dp"',
    'android:targetCellWidth="1"',
    'android:targetCellHeight="1"',
  ])
})

test('androidWidgetSizingAttributes prefers an explicit minWidth/minHeight over targetCell dimensions', () => {
  const { androidWidgetSizingAttributes } = loadAndroidWidgetSizingModule()

  assert.deepEqual(
    androidWidgetSizingAttributes({ targetCellWidth: 3, targetCellHeight: 3, minWidth: 200, minHeight: 100 }),
    [
      'android:minWidth="200dp"',
      'android:minHeight="100dp"',
      'android:targetCellWidth="3"',
      'android:targetCellHeight="3"',
    ]
  )
})

test('androidWidgetSizingAttributes falls back to the deprecated minCellWidth/minCellHeight', () => {
  const { androidWidgetSizingAttributes } = loadAndroidWidgetSizingModule()

  assert.deepEqual(
    androidWidgetSizingAttributes({
      targetCellWidth: 4,
      targetCellHeight: 4,
      minCellWidth: 2,
      minCellHeight: 2,
    }),
    [
      'android:minWidth="130dp"',
      'android:minHeight="117dp"',
      'android:targetCellWidth="4"',
      'android:targetCellHeight="4"',
    ]
  )
})

test('androidWidgetSizingAttributes prefers an explicit minWidth/minHeight over the deprecated minCellWidth/minCellHeight', () => {
  const { androidWidgetSizingAttributes } = loadAndroidWidgetSizingModule()

  assert.deepEqual(
    androidWidgetSizingAttributes({
      targetCellWidth: 4,
      targetCellHeight: 4,
      minCellWidth: 2,
      minCellHeight: 2,
      minWidth: 200,
      minHeight: 100,
    }),
    [
      'android:minWidth="200dp"',
      'android:minHeight="100dp"',
      'android:targetCellWidth="4"',
      'android:targetCellHeight="4"',
    ]
  )
})
