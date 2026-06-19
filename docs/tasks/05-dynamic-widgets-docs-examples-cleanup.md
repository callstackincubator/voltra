# 05 - Dynamic Widgets Docs And Examples Cleanup

## Goal

Update examples and documentation so Dynamic Widgets are described as app.json-driven and default-export based, not discovered by `'use voltra'`.

This task should run after the shared contract, platform manifest writers, and Metro manifest registry are implemented.

## Expected Scope

Primary files to inspect and likely update:

- `packages/metro/README.md`
- `packages/compiler/README.md` if compiler docs still imply active registration/discovery.
- `packages/ios-client/README.md`
- `packages/android-client/README.md`
- `website/docs/v2/ios/development/dynamic-widgets.md`
- `website/docs/v2/ios/development/configurable-widgets.md`
- `website/docs/v2/android/development/dynamic-widgets.md`
- `example/widgets/ios/ClientRenderedDemoWidget.tsx`
- `example/widgets/android/AndroidClientDemoWidget.tsx`
- Example app config files under `example/` that declare Voltra widgets.

## Requirements

- Use "Dynamic Widgets" as the feature name when describing widgets rendered on the native side.
- Documentation must state the new mental model:
  - app.json declares widgets.
  - `id` is the stable native/widget identity.
  - `entry` points to the implementation file.
  - The implementation module must export default.
  - No `export` field is supported.
  - The default-exported function/component name does not need to match `id`.
  - iOS and Android declarations remain separate.
  - Same id may exist on both platforms as separate declarations.
  - Expo prebuild validates config and writes `.voltra/manifest.ios.json` / `.voltra/manifest.android.json`.
  - Metro reads the relevant manifest and bundles only manifest-declared widgets.
- Update examples to default export widget implementations and remove `'use voltra'` as registration/discovery guidance.
- If `'use voltra'` remains anywhere, it must be described only as optional compiler metadata/validation for future or legacy tooling, not as registration.
- Add `entry` fields to example app config widget declarations.
- Ensure docs do not tell users that widget ids must match component names.
- Keep platform-specific config examples separate for iOS and Android.

## Constraints

- Do not change implementation behavior in this task unless a docs/example update reveals a small compile issue.
- Do not introduce native code examples for Dynamic Widgets.
- Do not promise backward compatibility with old `'use voltra'` registration.
- Avoid broad docs rewrites outside Dynamic Widgets.

## Reviewer Notes

- Check the docs with a fresh-user lens: could someone configure one iOS widget and one Android widget from app.json without knowing the old directive flow?
- Check that all code snippets include default export and `entry`.
- Check that old "component name must match id" wording is gone.
- Check that references to "client-rendered widgets" still make sense, or are renamed/explained as Dynamic Widgets where user-facing.

## Verification

Run formatting and package checks relevant to touched files:

```sh
pnpm run format:check
pnpm --filter @use-voltra/metro typecheck
pnpm --filter @use-voltra/ios-client typecheck
pnpm --filter @use-voltra/android-client typecheck
```

If examples or docs packages have their own checks, run those too:

```sh
pnpm run typecheck
pnpm run lint
pnpm run test
```

Commit using a conventional commit message, for example:

```sh
git commit -m "docs: document app-json dynamic widgets" -m "Updates Dynamic Widgets guidance and examples for manifest-driven default-export registration."
```
