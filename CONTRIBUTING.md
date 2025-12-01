# Contributing

Thank you for contributing to `voltra`! This document explains the local development workflow, how the iOS config plugin works, and how VoltraUI Swift sources are vendored locally (no external SPM required).

## Repository overview

- `src/` — JS/TS module sources (public API, JSON helpers).
- `ios/` — Native iOS module sources (Expo Modules).
- `ios-files/` — Widget/Live Activity template files copied by the config plugin.
  - `VoltraUIWidget.swift`, `VoltraUIWidgetBundle.swift`, `Assets.xcassets/`
  - `VoltraUI-main/` — vendored VoltraUI Swift source code from GitHub.
- `plugin/src/` — Expo config plugin that wires up the iOS extension target.
- `example/` — Example Expo app used to test the package.

## Local plugin development

The config plugin is written in TypeScript under `plugin/src/` and compiled to `plugin/build/`.

- Build only the plugin (recommended during development):

  ```sh
  npx tsc -p plugin/tsconfig.json
  ```

- If you previously ran `npm run clean:plugin` (which deletes `plugin/build/`), you must rebuild the plugin before running `expo prebuild` or `expo run:ios` in the example app — the Expo config system loads the plugin from `app.plugin.js` which points to `./plugin/build`.

- Full module build scripts:

  ```sh
  npm run build        # Starts expo-module-scripts watch, not required for plugin only
  npm run clean:plugin # Removes plugin/build and tsbuildinfo
  ```

## How VoltraUI is vendored locally

To avoid relying on a remote Swift Package, we vendor the VoltraUI Swift sources directly in this repository under `ios-files/VoltraUI-main/` (copied from GitHub).

The plugin copies these sources into the widget extension target during prebuild:

1. Copies `ios-files/VoltraUIWidget.swift`, `VoltraUIWidgetBundle.swift`, and `Assets.xcassets/`.
2. Copies the entire directory `ios-files/VoltraUI-main/Sources/VoltraUI/` into the extension target as `VoltraUI/`.
3. Adds all `.swift` files under `VoltraUI/` to the PBX Sources build phase.
4. The widget code in `VoltraUIWidget.swift` references `VoltraUI` types unconditionally and compiles them from the vendored sources (no `import VoltraUI` or SPM required).

This is implemented in `plugin/src/lib/getWidgetFiles.ts`.

## Example app workflow

From the repository root:

```sh
# 1) Compile the plugin so app.plugin.js can load ./plugin/build
npx tsc -p plugin/tsconfig.json

# 2) Install example deps (first time)
(cd example && npm install)

# 3) Prebuild the example for iOS
(cd example && npx expo prebuild -p ios)

# 4) Run on iOS
(cd example && npx expo run:ios)
```

If you’re iterating on the plugin, rerun step (1) after making changes in `plugin/src/**`.

## Troubleshooting

- EISDIR: illegal operation on a directory, read

  - Cause: Using an old compiled plugin that attempts to copy a directory as a file.
  - Fix:
    1. Rebuild the plugin: `npx tsc -p plugin/tsconfig.json`.
    2. Re-run prebuild in the example app: `(cd example && npx expo prebuild -p ios)`.

- Cannot find module './plugin/build'

  - Cause: You ran `npm run clean:plugin` (which deletes `plugin/build/`) and didn’t rebuild.
  - Fix: `npx tsc -p plugin/tsconfig.json` from the repo root.

- Widget target missing VoltraUI/ folder in Xcode
  - Ensure the plugin compiled and prebuild ran. Then open the iOS workspace and check the extension target for the `VoltraUI/` folder and many Swift files (e.g., `VoltraUI.swift`, `Views/*`, `Helpers/*`).

## Event forwarding via App Groups (optional)

The widget writes interaction events to a shared App Group queue. The app polls the queue and emits them via `addVoltraUIEventListener`.

- To enable, pass `groupIdentifier` to the plugin in your app config.
- The plugin adds the entitlements file and Info.plist keys for the extension and host app.

## Coding style

- TypeScript: follow the lints defined by `eslint.config.js` and `expo-module-scripts`.
- Swift: keep imports at the top of files; prefer small helpers to keep widgets tidy.

## Tests

- Unit tests for JS/TS live under `src/__tests__/`.
- Swift tests for the vendored package are not run by default in the example app.
- Run `npm run lint:libOnly`, `npm test`, and `npm run format:check` before opening a PR. If formatting fails, run `npx prettier --write .`.
- `npm run prepare` bundles the module and plugin; run it to catch build issues early.

## Releasing

- Ensure the plugin and module build successfully.
- Update the README and changelog as needed.

---

If anything in this guide is unclear, please file an issue or open a PR to improve it. Thanks!
