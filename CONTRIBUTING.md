# Contributing to Voltra

## Before you start any work

Please open an issue before starting to work on a new feature or a fix to a bug you encountered. This will prevent you from wasting your time on a feature that's not going to be merged, because for instance it's out of scope. If there is an existing issue present for the matter you want to work on, make sure to post a comment saying you are going to work on it. This will make sure there will be only one person working on a given issue.

## Development process

All work on Voltra happens directly on GitHub. Contributors send pull requests which go through the review process.

> **Working on your first pull request?** You can learn how from this _free_ series: [How to Contribute to an Open Source Project on GitHub](https://egghead.io/series/how-to-contribute-to-an-open-source-project-on-github).

1. Fork the repo and create your branch from `main` (a guide on [how to fork a repository](https://help.github.com/articles/fork-a-repo/)).
2. Run `npm install` to install all required dependencies.
3. Build the plugins: `npm run build:plugin`.
4. Now you are ready to make changes.

## Architecture overview

### JS/TS code structure

The JavaScript/TypeScript code is split by platform and runtime boundary:

- **iOS JSX (`packages/ios`)**: `Voltra` components and `@use-voltra/ios/server` rendering helpers.
- **iOS client (`packages/ios-client`)**: React Native runtime APIs, previews, and the iOS Expo config plugin.
- **Android JSX (`packages/android`)**: `VoltraAndroid` components and `@use-voltra/android/server` rendering helpers.
- **Android client (`packages/android-client`)**: React Native runtime APIs and the Android Expo config plugin.
- **Server packages (`packages/ios-server`, `packages/android-server`, `packages/server`)**: Node-only rendering and HTTP widget handlers.

⚠️ **Important**: Keep client and server entry points separate. App bundles must not import server-only packages.

### Expo config plugins

- `packages/expo-plugin/` — shared validation, locale picking, prerender utilities
- `packages/ios-client/expo-plugin/` — iOS Live Activities, widget extension, Xcode setup
- `packages/android-client/expo-plugin/` — Android widgets and manifest

The iOS plugin handles Xcode project setup during `expo prebuild`:

1. **Creates the widget extension target** with proper build settings
2. **Copies template files** from `ios-files/` (widget bundle, assets, Info.plist) into the extension target
3. **Configures CocoaPods** to include the `VoltraWidget` subspec in the extension target
4. **Sets up entitlements** for App Groups (optional, for event forwarding)
5. **Configures push notifications** (optional)

### Swift code distribution (`packages/ios-client/ios/`)

Voltra's Swift sources for the iOS React Native client live under `@use-voltra/ios-client` and ship as **CocoaPods** pods:

- **`Voltra.podspec`**: React Native Turbo Module + Fabric view + shared Swift UI (`ios/app/`, `ios/ui/`, `ios/shared/`).
- **`VoltraWidget.podspec`**: Widget extension Swift (`ios/ui/`, `ios/shared/`, `ios/target/`).

```ruby
# From packages/ios-client/Voltra.podspec (paths relative to the podspec)
s.source_files = [
  "ios/app/**/*.swift",
  "ios/app/**/*.m",
  "ios/app/**/*.mm",
  "ios/ui/**/*.swift",
  "ios/shared/**/*.swift",
]
```

### Template files (`ios-files/`)

Files in `ios-files/` are copied by the config plugin into the generated widget extension:

- `VoltraWidgetBundle.swift` — Widget bundle entry point
- `Assets.xcassets/` — Asset catalog for the extension
- `Info.plist` — Extension configuration

## Props synchronization

Component props are kept in sync across TypeScript, Swift, and Kotlin via a **custom code generator**. The single source of truth is:

```
packages/voltra/data/components.json
```

This file defines all components, their parameters, platform availability, and short names used for payload compression.

### Running the generator

```sh
npm run generate
```

This runs the generator (`packages/voltra/generator/generate-types.ts`).

The generator filters components by platform (`swiftAvailability` for iOS, `androidAvailability` for Android) and writes outputs to the packages that own each runtime:

| Output                                     | Path                                                                                    |
| ------------------------------------------ | --------------------------------------------------------------------------------------- |
| **TypeScript prop types (iOS)**            | `packages/ios/src/jsx/props/*.ts`                                                       |
| **TypeScript prop types (Android)**        | `packages/android/src/jsx/props/*.ts`                                                   |
| **Swift parameter structs**                | `packages/ios-client/ios/ui/Generated/Parameters/*.swift`                               |
| **Kotlin parameter structs**               | `packages/android-client/android/src/main/java/voltra/models/parameters/*Parameters.kt` |
| **iOS component ID mappings (TS)**         | `packages/ios/src/payload/component-ids.ts`                                             |
| **Android component ID mappings (TS)**     | `packages/android/src/payload/component-ids.ts`                                         |
| **iOS component ID mappings (Swift)**      | `packages/ios-client/ios/shared/ComponentTypeID.swift`                                  |
| **Android component ID mappings (Kotlin)** | `packages/android-client/android/src/main/java/voltra/payload/ComponentTypeID.kt`       |
| **Short name mappings (TS)**               | `packages/core/src/payload/short-names.ts`                                              |
| **Short name mappings (Swift)**            | `packages/ios-client/ios/shared/ShortNames.swift`                                       |
| **Short name mappings (Kotlin)**           | `packages/android-client/android/src/main/java/voltra/generated/ShortNames.kt`          |

After generation, the script formats JS (iOS and Android packages), Kotlin (`@use-voltra/android-client`), and Swift (`@use-voltra/ios-client`).

⚠️ **Important**: When adding new components or modifying props, always update `packages/voltra/data/components.json` first, then run the generator. Do not manually edit generated files (directories include a `.generated` marker file). Component `.tsx` files that call `createVoltraComponent` are still written by hand in `packages/ios/src/jsx/` and `packages/android/src/jsx/`.

## Payload size budget

Live Activity payloads have strict size limits imposed by iOS. Voltra includes tests that track payload sizes for real-world examples.

### How it works

The test in `src/__tests__/payload-size.node.test.tsx` renders example components and snapshots their compressed payload size:

```typescript
it('BasicLiveActivityUI', async () => {
  const size = await getPayloadSize({
    lockScreen: <BasicLiveActivityUI />,
  })
  expect(size).toMatchSnapshot()
})
```

### When payload size changes

If your changes affect payload size, the tests will fail. This is intentional:

- **Size decreased?** Great! Run `npm test -- -u` to update snapshots and lock in the improvement.
- **Size increased?** Investigate carefully. Is the increase justified? Can it be optimized? Only update snapshots after confirming the increase is necessary.

⚠️ **CI will block merging** if payload size snapshots are out of date. This ensures we don't accidentally regress payload efficiency.

## Payload schema versioning

The payload schema has a version number to support forward compatibility. When the Swift code receives a payload with a newer version than it understands, it renders empty instead of crashing.

### Version constants

The version is defined in two places that must stay in sync:

- **TypeScript**: `packages/voltra/src/renderer/renderer.ts` → `VOLTRA_PAYLOAD_VERSION`
- **Swift**: `packages/ios-client/ios/shared/VoltraPayloadMigrator.swift` → `currentVersion`

### When to increment the version

Increment the version when making **breaking changes** to the payload schema:

- Adding required fields that old Swift code wouldn't understand
- Changing the structure of existing fields
- Renaming keys in a way that breaks parsing

You do **not** need to increment for:

- Adding optional fields (old Swift code will ignore them)
- Bug fixes that don't change the schema
- Adding new component types (they render as `EmptyView` if unknown)

### Adding migrations

When you increment the version, add a migration in Swift to upgrade old payloads:

1. Increment `currentVersion` in both TypeScript and Swift
2. Create a migration struct implementing `VoltraPayloadMigration`
3. Register it in the `migrations` dictionary

```swift
// Example: V1ToV2Migration.swift
struct V1ToV2Migration: VoltraPayloadMigration {
    static let fromVersion = 1
    static let toVersion = 2

    static func migrate(_ json: JSONValue) throws -> JSONValue {
        // Transform v1 payload to v2 format
        // Update the version field
        var result = json
        result["v"] = .int(2)
        return result
    }
}

// In VoltraPayloadMigrator.swift:
private static let migrations: [Int: any VoltraPayloadMigration.Type] = [
    1: V1ToV2Migration.self,
]
```

This ensures users with older apps can still receive updates from newer servers.

## Testing your changes

The `example/` directory contains an Expo app for testing changes.

### Running the example app

```sh
# 1) Build the plugin
npm run build:plugin

# 2) Install example dependencies
(cd example && npm install)

# 3) Prebuild for iOS
(cd example && npx expo prebuild -p ios)

# 4) Run on iOS
(cd example && npx expo run:ios)
```

If iterating on a plugin, rebuild after each change under `packages/expo-plugin/src/`, `packages/ios-client/expo-plugin/src/`, or `packages/android-client/expo-plugin/src/`.

### Running tests

Run the following checks before opening a pull request:

```sh
# Linting
npm run lint:libOnly

# Type checking
npm run build

# Unit tests
npm test

# Format check
npm run format:check
```

If formatting fails, run `npx prettier --write .` to fix it.

## Creating a pull request

When you are ready to have your changes incorporated into the main codebase, open a pull request.

This repository follows [the Conventional Commits specification](https://www.conventionalcommits.org/en/v1.0.0/#summary). Please follow this pattern in your pull request titles. Keep in mind your commits will be squashed before merging and the title will be used as a commit title.

### Pull request checklist

- [ ] Tests pass (`npm test`)
- [ ] Linting passes (`npm run lint:libOnly`)
- [ ] Formatting is correct (`npm run format:check`)
- [ ] If props changed, generator was run (`npm run generate`)
- [ ] If payload size changed, snapshots were intentionally updated
- [ ] Documentation updated if needed

## License

By contributing to Voltra, you agree that your contributions will be licensed under its MIT license.
