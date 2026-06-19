# 03 - Android Dynamic Widgets Manifest Emission

## Goal

Make `@use-voltra/android-client` validate app.json-driven Android Dynamic Widgets during Expo prebuild and write `.voltra/manifest.android.json`.

The Android plugin owns only the Android manifest. iOS declarations are separate and must be ignored by this task.

## Expected Scope

Primary files to inspect and likely update:

- `packages/android-client/expo-plugin/src/types.ts`
- `packages/android-client/expo-plugin/src/validation.ts`
- `packages/android-client/expo-plugin/src/index.ts`
- `packages/android-client/expo-plugin/src/validation.node.test.ts`
- New package-local tests for manifest writing if needed.

Useful context:

- `packages/expo-plugin/src/validation.ts` should expose shared entry validation and manifest helpers after task 01.
- Existing Android config already validates widget picker metadata and native manifest/resource setup.

## Requirements

- Add `entry` to `AndroidWidgetConfig`.
- Validate every Android widget has a valid `entry`.
- Validation must use the Expo project root when available.
- Preserve existing Android validation:
  - `id`
  - `displayName`
  - `description`
  - cell sizes
  - preview image/layout
  - `initialStatePath`
  - server update and app intent behavior
- During prebuild, write `.voltra/manifest.android.json` under the project root.
- The Android manifest must be overwritten by the Android plugin on every relevant prebuild run.
- The manifest should include only Android widget declarations.
- Each manifest widget must include the stable `id` and normalized project-relative `entry`.
- It is fine to include additional non-sensitive metadata useful to Metro, but do not put native-only details in the manifest unless Metro needs them.
- If there are zero Android widgets, write a valid empty Android manifest rather than leaving stale declarations behind.

## Constraints

- Do not write `.voltra/manifest.ios.json`.
- Do not scan source files for `'use voltra'`.
- Do not require the default export function/component name to match `id`.
- Do not add an `export` field to app.json.
- Do not manually edit Kotlin, Java, XML, or Gradle files for this task beyond the existing plugin flow.
- Keep the feature name/user-facing wording as "Dynamic Widgets" when describing native-rendered widgets.

## Reviewer Notes

- Check that manifest writes are deterministic and use the same shape as iOS except for `platform`.
- Check that manifest output does not depend on current working directory.
- Check that Android duplicate ids are still rejected within Android config only.
- Check that old stale Android manifest contents cannot survive a prebuild with fewer widgets.
- Check that preview image/layout validation remains Android-only and does not leak into shared helpers.

## Verification

Run the narrow checks:

```sh
pnpm --filter @use-voltra/android-client test
pnpm --filter @use-voltra/android-client typecheck
pnpm --filter @use-voltra/android-client lint
```

If shared exports or plugin behavior changed, also run:

```sh
pnpm run typecheck
pnpm run lint
pnpm run test
```

Commit using a conventional commit message, for example:

```sh
git commit -m "feat: emit android dynamic widgets manifest" -m "Validates Android widget entry paths during prebuild and writes the Android-owned Voltra manifest."
```
