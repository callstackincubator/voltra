# 02 - iOS Dynamic Widgets Manifest Emission

## Goal

Make `@use-voltra/ios-client` validate app.json-driven iOS Dynamic Widgets during Expo prebuild and write `.voltra/manifest.ios.json`.

The iOS plugin owns only the iOS manifest. Android declarations are separate and must be ignored by this task.

## Expected Scope

Primary files to inspect and likely update:

- `packages/ios-client/expo-plugin/src/types.ts`
- `packages/ios-client/expo-plugin/src/validation.ts`
- `packages/ios-client/expo-plugin/src/index.ts`
- `packages/ios-client/expo-plugin/src/validation.node.test.ts`
- New package-local tests for manifest writing if needed.

Useful context:

- `packages/expo-plugin/src/validation.ts` should expose shared entry validation and manifest helpers after task 01.
- Existing iOS config already validates widgets and configures native widget extension setup.

## Requirements

- Add `entry` to `IOSWidgetConfig`.
- Validate every iOS widget has a valid `entry`.
- Validation must use the Expo project root when available.
  - If the iOS plugin currently does not read `config.modRequest.projectRoot`, thread that through validation and manifest writing.
- Preserve existing iOS validation:
  - `id`
  - `displayName`
  - `description`
  - `supportedFamilies`
  - `initialStatePath`
  - server update and app intent behavior
- During prebuild, write `.voltra/manifest.ios.json` under the project root.
- The iOS manifest must be overwritten by the iOS plugin on every relevant prebuild run.
- The manifest should include only iOS widget declarations.
- Each manifest widget must include the stable `id` and normalized project-relative `entry`.
- It is fine to include additional non-sensitive metadata useful to Metro, but do not put native-only details in the manifest unless Metro needs them.
- If there are zero iOS widgets, write a valid empty iOS manifest rather than leaving stale declarations behind.

## Constraints

- Do not write `.voltra/manifest.android.json`.
- Do not scan source files for `'use voltra'`.
- Do not require the default export function/component name to match `id`.
- Do not add an `export` field to app.json.
- Do not manually edit Swift or native project files for this task beyond the existing plugin flow.
- Keep the feature name/user-facing wording as "Dynamic Widgets" when describing native-rendered widgets.

## Reviewer Notes

- Check that manifest writes are deterministic and pretty enough for review/debugging.
- Check that manifest output does not depend on current working directory.
- Check that entry paths are normalized the same way across platforms.
- Check that iOS duplicate ids are still rejected within iOS config only.
- Check that old stale iOS manifest contents cannot survive a prebuild with fewer widgets.

## Verification

Run the narrow checks:

```sh
pnpm --filter @use-voltra/ios-client test
pnpm --filter @use-voltra/ios-client typecheck
pnpm --filter @use-voltra/ios-client lint
```

If shared exports or plugin behavior changed, also run:

```sh
pnpm run typecheck
pnpm run lint
pnpm run test
```

Commit using a conventional commit message, for example:

```sh
git commit -m "feat: emit ios dynamic widgets manifest" -m "Validates iOS widget entry paths during prebuild and writes the iOS-owned Voltra manifest."
```
