# Contributing to Voltra

## Before you start any work

Please open an issue before starting to work on a new feature or a fix to a bug you encountered. This will prevent you from wasting your time on a feature that's not going to be merged, because for instance it's out of scope. If there is an existing issue present for the matter you want to work on, make sure to post a comment saying you are going to work on it. This will make sure there will be only one person working on a given issue.

## Development process

All work on Voltra happens directly on GitHub. Contributors send pull requests which go through the review process.

> **Working on your first pull request?** You can learn how from this _free_ series: [How to Contribute to an Open Source Project on GitHub](https://egghead.io/series/how-to-contribute-to-an-open-source-project-on-github).

1. Fork the repo and create your branch from `main` (a guide on [how to fork a repository](https://help.github.com/articles/fork-a-repo/)).
2. Run `npm install` to install all required dependencies.
3. Build the plugin: `npx tsc -p plugin/tsconfig.json`.
4. Now you are ready to make changes.

## Architecture overview

### JS/TS code structure

The JavaScript/TypeScript code has **two separate entry points** that must be maintained as independent boundaries:

- **Client entry (`src/index.ts`)**: React Native code that runs in the app. Exports JSX components, hooks, and the imperative API for managing Live Activities.
- **Server entry (`src/server.ts`)**: Node.js code for rendering Voltra components to string payloads. Used for server-side rendering and push notification payloads.

⚠️ **Important**: These two entry points must remain separate. Client code should not import server-only dependencies, and server code should not import React Native-specific modules.

### Expo config plugin (`plugin/`)

The Expo plugin in `plugin/src/` handles all Xcode project setup during `expo prebuild`:

1. **Creates the widget extension target** with proper build settings
2. **Copies template files** from `ios-files/` (widget bundle, assets, Info.plist) into the extension target
3. **Configures CocoaPods** to include the `Voltra/Widget` subspec in the extension target
4. **Sets up entitlements** for App Groups (optional, for event forwarding)
5. **Configures push notifications** (optional)

### Swift code distribution (`ios/`)

Voltra's Swift code lives in `ios/` and is distributed as a **CocoaPods package** with multiple subspecs:

```ruby
# From ios/Voltra.podspec
s.subspec 'Core' do |ss|
  # React Native bridge module (auto-linked by Expo)
  ss.source_files = ["app/**/*.swift", "shared/**/*.swift", "ui/**/*.swift"]
end

s.subspec 'Widget' do |ss|
  # Widget extension code (used by Live Activity target)
  ss.source_files = ["shared/**/*.swift", "ui/**/*.swift", "target/**/*.swift"]
end
```

- **`Core` subspec**: Contains the React Native module (`app/`), shared code (`shared/`), and UI components (`ui/`). Auto-linked by Expo in the main app.
- **`Widget` subspec**: Contains shared code, UI components, and widget-specific files (`target/`). Used by the Live Activity extension target.

This separation ensures the widget extension doesn't include unnecessary React Native dependencies.

### Template files (`ios-files/`)

Files in `ios-files/` are copied by the config plugin into the generated widget extension:

- `VoltraWidgetBundle.swift` — Widget bundle entry point
- `Assets.xcassets/` — Asset catalog for the extension
- `Info.plist` — Extension configuration

## Props synchronization

Component props are kept in sync between TypeScript and Swift via a **custom code generator**. The single source of truth is:

```
data/components.json
```

This file defines all components, their parameters, types, and short names used for payload compression.

### Running the generator

```sh
npm run generate
```

This generates:

- **TypeScript prop types**: `src/jsx/props/*.ts`
- **Swift parameter structs**: `ios/ui/Generated/Parameters/*.swift`
- **Component ID mappings**: `src/payload/component-ids.ts` and `ios/shared/ComponentTypeID.swift`
- **Short name mappings**: `src/payload/short-names.ts` and `ios/shared/ShortNames.swift`

⚠️ **Important**: When adding new components or modifying props, always update `data/components.json` first, then run the generator. Do not manually edit generated files (marked with `.generated`).

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

- **TypeScript**: `src/renderer/renderer.ts` → `VOLTRA_PAYLOAD_VERSION`
- **Swift**: `ios/shared/VoltraPayloadMigrator.swift` → `currentVersion`

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
npx tsc -p plugin/tsconfig.json

# 2) Install example dependencies
(cd example && npm install)

# 3) Prebuild for iOS
(cd example && npx expo prebuild -p ios)

# 4) Run on iOS
(cd example && npx expo run:ios)
```

If iterating on the plugin, rebuild after each change in `plugin/src/`.

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
