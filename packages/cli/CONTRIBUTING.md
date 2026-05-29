# Contributing to `voltra`

This package contains the CLI used to apply Voltra to standard native React Native projects.

For the repo-wide contribution process, see the root [CONTRIBUTING.md](../../CONTRIBUTING.md).

## High-level overview

The CLI is organized around one user-facing workflow: load Voltra config, validate the target native project, apply the requested platform changes, clean up stale generated files, then report the result.

At a high level:

- `src/bin.ts` is the executable entry point.
- `src/commands/apply.ts` defines the public CLI command and translates argv into apply options.
- `src/apply/` orchestrates the end-to-end apply pipeline and preflight checks.
- `src/config/` loads and normalizes Voltra config before any platform work starts.
- `src/discovery/` resolves the native project layout for Android and iOS.
- `src/platforms/android/` and `src/platforms/ios/` contain platform-specific preflight and apply logic.
- `src/state/` tracks Voltra-owned generated files so later runs can clean up stale output safely.
- `src/reporting/` owns terminal output, errors, and apply summaries.
- `src/git/` handles git worktree checks before writes begin.
- `src/fs/` contains shared filesystem helpers used across the pipeline.

## Design intent

The package is intentionally convention-first:

- config loading happens up front
- discovery and validation fail before writes when the target project is missing or ambiguous
- platform-specific code owns native mutations
- only Voltra-owned generated files are tracked for cleanup
- terminal reporting stays separate from the mutation logic

This separation keeps the apply pipeline straightforward to reason about and makes platform behavior easier to evolve independently.

## Development notes

Useful package-local commands:

```sh
npm run build --workspace packages/cli
npm run lint --workspace packages/cli
npm run typecheck --workspace packages/cli
npm run test --workspace packages/cli
```

When changing behavior, prefer keeping orchestration in `src/apply/` and pushing platform-specific details into the relevant platform directory instead of adding cross-platform branching in many places.
