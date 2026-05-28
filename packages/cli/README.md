# voltra

CLI for applying Voltra to standard native React Native projects.

`voltra` is the non-Expo path for wiring Voltra into an existing native app.

V1 exposes one public command:

```sh
voltra apply
```

It loads Voltra config, discovers the native project, generates Voltra-owned files, mutates required native project files, removes stale generated files from previous runs, and writes `.voltra/state.json` after a successful apply.

## Install

```sh
npm install --save-dev voltra
npm install @use-voltra/ios-client
```

If you apply only Android, the iOS client package is not required.

## Command

```sh
voltra apply [--platform ios|android] [--config <path>]
```

Options:

- `--platform ios|android`: limit apply to one platform.
- `--config <path>`: load config from an explicit file path.
- `-h`, `--help`: show command help.

Examples:

```sh
# Apply both configured platforms
npx voltra apply

# Apply only iOS
npx voltra apply --platform ios

# Apply using an explicit config file
npx voltra apply --config ./config/voltra.config.ts

# Re-apply only Android without removing tracked iOS files
npx voltra apply --platform android
```

## Config Files

`voltra` uses `cosmiconfig` and searches these locations:

- `package.json` under `voltra`
- `.voltrarc`
- `.voltrarc.json`
- `.voltrarc.yaml`
- `.voltrarc.yml`
- `.voltrarc.js`
- `.voltrarc.cjs`
- `.voltrarc.mjs`
- `.voltrarc.ts`
- `voltra.config.json`
- `voltra.config.yaml`
- `voltra.config.yml`
- `voltra.config.js`
- `voltra.config.cjs`
- `voltra.config.mjs`
- `voltra.config.ts`

When `--config` is provided, that file is loaded directly instead of searching.

## Path Resolution

- `configDir` is the directory containing the loaded config file.
- `projectRoot` defaults to `configDir`.
- `projectRoot` can be overridden in config.
- Relative widget, preview, font, and project-override paths resolve from `projectRoot`.

## Config Shape

The CLI config stays close to the existing Expo plugin config, with extra project-discovery overrides for native apps.

```ts
import type { VoltraConfig } from 'voltra'

const config: VoltraConfig = {
  projectRoot: '.',
  android: {
    enableNotifications: true,
    fonts: ['./assets/fonts/Inter-Regular.ttf'],
    userImagesPath: './assets/voltra-android',
    project: {
      rootDir: './android',
      appModuleName: 'app',
      manifestPath: './android/app/src/main/AndroidManifest.xml',
      packageName: 'com.example.app',
    },
    widgets: [
      {
        id: 'scoreboard',
        displayName: 'Scoreboard',
        description: 'Live score widget',
        targetCellWidth: 2,
        targetCellHeight: 2,
        previewImage: './assets/widgets/scoreboard-preview.png',
        initialStatePath: './widgets/scoreboard.android.tsx',
      },
    ],
  },
  ios: {
    enablePushNotifications: true,
    groupIdentifier: 'group.com.example.app',
    keychainGroup: '$(AppIdentifierPrefix)com.example.shared',
    deploymentTarget: '16.0',
    targetName: 'ExampleLiveActivity',
    fonts: ['./assets/fonts/Inter-Regular.ttf'],
    project: {
      rootDir: './ios',
      xcodeprojPath: './ios/Example.xcodeproj',
      mainTargetName: 'Example',
      infoPlistPath: './ios/Example/Info.plist',
      entitlementsPath: './ios/Example/Example.entitlements',
      podfilePath: './ios/Podfile',
    },
    widgets: [
      {
        id: 'portfolio',
        displayName: {
          en: 'Portfolio',
          pl: 'Portfel',
        },
        description: 'Track holdings',
        supportedFamilies: ['systemSmall', 'systemMedium'],
        initialStatePath: {
          en: './widgets/portfolio.ios.en.tsx',
          pl: './widgets/portfolio.ios.pl.tsx',
        },
        serverUpdate: {
          url: 'https://example.com/widgets/portfolio',
          intervalMinutes: 30,
          refresh: true,
        },
      },
    ],
  },
}

export default config
```

## Discovery Defaults

`voltra apply` is convention-first and only needs overrides for non-standard layouts or ambiguous native projects.

For generated assets, Android reads `android.userImagesPath` and iOS uses the current default widget asset location under `./assets/voltra`.

### Android

Default discovery:

- Android root: `android/`
- app module: `app`
- manifest: `android/app/src/main/AndroidManifest.xml`
- package name: resolved from `android.project.packageName`, then app-module `namespace`, then `applicationId`, then manifest `package`

Android override fields:

- `android.project.rootDir`
- `android.project.appModuleName`
- `android.project.manifestPath`
- `android.project.packageName`

### iOS

Default discovery:

- iOS root: `ios/`
- Podfile: `ios/Podfile`
- Xcode project: the only `.xcodeproj` under `ios/`
- main app target: the only application target in `project.pbxproj`
- main app `Info.plist` and entitlements: resolved from the selected target build settings

iOS override fields:

- `ios.project.rootDir`
- `ios.project.xcodeprojPath`
- `ios.project.mainTargetName`
- `ios.project.infoPlistPath`
- `ios.project.entitlementsPath`
- `ios.project.podfilePath`

If discovery is missing or ambiguous, `voltra apply` fails during preflight before writing any files.

## Dirty Git Worktree Behavior

Before writing files, `voltra apply` checks the git worktree:

- clean worktree: continue
- dirty worktree in an interactive terminal: print a warning and ask for confirmation
- dirty worktree in a non-interactive environment: fail before applying changes
- no git repository: continue without blocking apply

## Generated Files And State Tracking

Voltra tracks only fully generated, Voltra-owned files in:

```text
.voltra/state.json
```

Example state file:

```json
{
  "schemaVersion": 1,
  "files": [
    "ios/ExampleLiveActivity/Info.plist",
    "ios/ExampleLiveActivity/VoltraWidgetBundle.swift",
    "android/app/src/main/res/xml/voltra_widget_scoreboard_info.xml"
  ]
}
```

Rules:

- paths are stored relative to `projectRoot`
- only generated Voltra-owned files are tracked
- stale generated files from previous runs are removed after a successful apply
- shared native files are not reverted from state history

Shared files are always reconciled from current config instead of state history. That includes:

- `AndroidManifest.xml`
- main app `Info.plist`
- entitlements
- `Podfile`
- `project.pbxproj`

## Apply Summary

After a successful run, `voltra apply` prints a summary of created, updated, and deleted files, followed by any warnings.

## Scope Notes

Current v1 scope is intentionally narrow:

- one public command: `voltra apply`
- standard native React Native project layouts first
- no plan or diff mode
- no rollback system
- no broad mutation history beyond `.voltra/state.json`
