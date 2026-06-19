# 04 - Metro Dynamic Widgets Manifest Registry

## Goal

Replace Metro's whole-project `'use voltra'` scanning with a manifest-driven registry that reads `.voltra/manifest.{platform}.json`, generates adapter entrypoints, and exposes/builds widgets by platform plus `id`.

This is the core behavior change: Metro must bundle only manifest-declared Dynamic Widgets.

## Expected Scope

Primary files to inspect and likely update:

- `packages/metro/src/widgetRegistry.ts`
- `packages/metro/src/bundleWidgets.ts`
- `packages/metro/src/createVoltraMiddleware.ts`
- `packages/metro/src/index.ts`
- `packages/metro/src/createWidgetMetroConfig.ts` if platform handling or error behavior needs adjustment.
- `packages/metro/package.json` only if tests/exports need updating.
- New `packages/metro/src/*.node.test.ts` tests, since this package currently uses `node --test`.

Useful context:

- Platform plugins should now emit `.voltra/manifest.ios.json` and `.voltra/manifest.android.json`.
- The manifest can contain only `id` and `entry`; Metro should generate JS adapter entrypoints from it.
- The adapter imports the widget module default export, parses props/env, calls the widget, renders through the platform renderer, and exposes the stable `render()` function expected by native runtimes.

## Requirements

- Stop scanning the project for `'use voltra'`.
- Stop requiring widget export names or component names to match `id`.
- Treat the widget implementation as the default export of the manifest `entry`.
- Read the relevant manifest for the requested platform:
  - iOS: `.voltra/manifest.ios.json`
  - Android: `.voltra/manifest.android.json`
- If the manifest is missing, surface a clear error that says to run Expo prebuild for that platform. The error should include the expected manifest path.
- Validate manifest shape before using it:
  - expected version
  - expected platform
  - `widgets` is an array
  - widget ids are valid and unique within the manifest
  - entries are valid normalized project-relative source paths
- Generate adapter entrypoints under `.voltra/metro/widgets`.
- Adapter behavior:
  - Import the default export from the manifest entry.
  - Throw a clear error if the default export is missing.
  - Parse `propsJSON` and `envJSON`.
  - Invoke the default widget implementation with props/env using the established renderer flow.
  - Export the stable `render()` function and default export.
- Renderer selection should remain platform-aware. The existing render shim approach is acceptable if it still resolves `.ios` and `.android` correctly.
- Widget lookup must become platform plus `id`.
  - Dev middleware should use the request `platform` query parameter to find the correct platform manifest/widget.
  - `bundleWidgets({ platform })` should bundle only that platform's manifest widgets.
- Dev hot-reload barrels should import only manifest-declared entries for each platform.
- Remove path-based platform inference from widget source paths.
- Keep `ensureEmptyDevBarrel` behavior useful for projects without generated widgets if it is still needed by aliases.

## Constraints

- Do not resurrect `@use-voltra/compiler` scanning in Metro.
- Do not use an app.json `export` field.
- Do not require implementation function names to match widget ids.
- Do not globally de-duplicate ids across iOS and Android; de-duplicate only within each platform manifest.
- Do not hand-edit generated build artifacts unless package build conventions require it.
- Error messages should be actionable for app developers.

## Reviewer Notes

- Check that a missing manifest fails loudly instead of silently returning zero widgets.
- Check that an empty manifest is treated as valid and results in "no widgets to bundle" for release builds.
- Check that `/widgets/<id>.bundle?platform=ios` and `/widgets/<id>.bundle?platform=android` can point at different entries with the same id.
- Check that the adapter imports default only and does not use named exports.
- Check that generated file names are stable enough for repeated runs and do not collide between platforms.

## Verification

Run the narrow checks:

```sh
pnpm --filter @use-voltra/metro test
pnpm --filter @use-voltra/metro typecheck
pnpm --filter @use-voltra/metro lint
```

Then run repo-level checks because this task changes core integration behavior:

```sh
pnpm run typecheck
pnpm run lint
pnpm run test
```

Commit using a conventional commit message, for example:

```sh
git commit -m "feat: load dynamic widgets from manifests in metro" -m "Replaces use-voltra source scanning with platform manifest lookup and generated default-export adapters."
```
