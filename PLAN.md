## Voltra CLI Plan

### Goal

Ship a new published package `voltra` that applies Voltra native integration to standard non-Expo React Native projects.

V1 should do one thing well: `voltra apply`.

It should:
- load Voltra config
- discover the native project
- generate Voltra-owned files
- mutate required native project files
- clean up stale generated files from previous runs

It should not try to solve everything else yet.

### Scope Cuts

These are intentional simplifications for v1:
- no large shared-core refactor first
- no reuse of Expo mod wrappers
- no generic mutation framework
- no plan/diff mode
- no rollback system
- no rich `.voltra/state.json` metadata
- no broad support beyond standard React Native layouts
- no attempt to undo shared-file mutations from history
- no test implementation yet

### Core Decisions

- package name: `voltra`
- binary name: `voltra`
- publish as a public npm package from day one
- use `cosmiconfig` to load config from multiple supported file formats
- `projectRoot` defaults to the config file directory
- `projectRoot` can be overridden in config
- all relative paths resolve from `projectRoot`
- default behavior should follow Expo plugin defaults unless config overrides it
- if git worktree is dirty, warn and ask before continuing
- if running non-interactively, fail on dirty worktree unless explicitly bypassed
- do full preflight before the first write
- reuse only pure helpers and generators where practical
- duplicate CLI-native mutation code where that keeps the package simpler and more independent

### Config

Use `cosmiconfig`.

Support common config locations from day one:
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

Rules:
- `configDir` is the directory containing the loaded config file
- `projectRoot` defaults to `configDir`
- `projectRoot` can be overridden in config
- all relative widget, asset, preview, and font paths resolve from `projectRoot`
- config shape should stay close to current Expo plugin props, with extra fields for native project discovery overrides

### Command Surface

V1 public interface:
- `voltra apply`
- optional `--platform ios|android`
- optional `--config <path>`

No other public commands are required in v1.

### Internal Apply Pipeline

Even with one public command, keep the internals split into clear stages:

1. load config
2. normalize config
3. detect git state
4. if dirty:
   - interactive mode: warn and ask for confirmation
   - non-interactive mode: fail unless explicitly bypassed
5. discover all required native project files for requested platforms
6. parse and preflight all of them
7. abort before writes if any required artifact is missing or ambiguous
8. load previous Voltra state
9. compute stale generated files
10. apply generated file writes and shared-file mutations
11. delete stale generated files
12. write new Voltra state only after success
13. print summary of changed files and warnings

Important safety rule:
- no writes before all targeted platforms finish discovery and preflight

### State Tracking

Store CLI state in `${projectRoot}/.voltra/state.json`.

Keep it minimal:

```json
{
  "schemaVersion": 1,
  "files": [
    "ios/MyWidget/Info.plist",
    "ios/MyWidget/VoltraWidgetBundle.swift",
    "android/app/src/main/res/xml/voltra_widget_score_info.xml"
  ]
}
```

Rules:
- store only relative file paths
- track only fully generated Voltra-owned files
- load previous file list
- compute new file list
- remove stale files from `previous.files - next.files`
- write new state only after a successful run

Do not store:
- file kind
- owning widget ID
- feature name
- file hashes
- directories
- Xcode UUIDs

Do not use state to revert shared-file mutations in:
- `AndroidManifest.xml`
- `Info.plist`
- entitlements
- `Podfile`
- `project.pbxproj`

Those files should always be reconciled from current desired config.

### Reuse Strategy

Reuse only the parts that are already simple and low-risk:
- validation helpers
- prerendering
- locale helpers
- font resolution
- pure generators for Android and iOS generated files
- small pure helper functions that compute plist or entitlement values if useful

Do not reuse:
- Expo config plugin wrappers
- Expo mod orchestration
- current Xcode mutation implementation as-is

For native mutation code, duplicating CLI-native logic is acceptable if it keeps the package simpler and avoids coupling the public CLI to Expo-specific internals.

### Android Plan

Android should ship first.

V1 Android scope:
- manifest mutation
- receiver generation
- XML/widget info generation
- layouts
- drawable assets
- preview assets
- fonts
- initial state generation

Implementation approach:
- reuse current Android generators where practical
- write a CLI-native Android manifest mutator
- use XML parsing instead of raw string replacement

Discovery should be convention-first with overrides:
- default `android/`
- default app module `app`
- default manifest `android/app/src/main/AndroidManifest.xml`
- allow config overrides for nonstandard layouts

Android mutation rules:
- ensure permissions by exact name
- ensure receivers by exact class name
- ensure metadata by exact resource reference
- never duplicate
- preserve unrelated manifest content
- write atomically where practical

### iOS Plan

iOS should ship second.

Split iOS into two slices.

Slice 1:
- widget extension file generation
- main app `Info.plist` mutation
- entitlements mutation
- Podfile mutation

Slice 2:
- `project.pbxproj` mutation using `@bacons/xcode`

Implementation approach:
- reuse current iOS generated-file logic where practical
- duplicate or extract small pure helpers for plist keys and entitlements
- use plist parsing/building instead of raw string replacement
- use a Voltra-managed block in Podfile
- port current Xcode behavior into CLI-native code

Discovery should be convention-first but strict:
- default `ios/`
- discover `.xcodeproj`
- discover main app target
- discover main `Info.plist`
- discover Podfile
- allow explicit overrides when ambiguous

iOS mutation rules:
- update if present
- insert if missing
- avoid duplicates
- preserve unrelated user content
- write atomically where practical

### Mutation Style

No sophisticated abstraction layer is needed in v1.

Use focused functions per artifact, for example:
- `ensureAndroidManifest`
- `ensureInfoPlist`
- `ensureEntitlements`
- `ensurePodfileBlock`
- `ensureXcodeWidgetTarget`

Each should:
- read current state
- update existing entries when found
- insert missing entries
- avoid duplicates
- preserve unrelated content

### Build And Packaging

`packages/cli` should use a Node CLI build path, not the React Native library packaging flow.

Needs:
- `bin` entry for `voltra`
- shebang
- Node runtime target
- source maps
- compatibility with public npm publishing

### Testability Constraint

We are skipping tests for now, but the code should be structured so tests are easy to add later.

That means:
- keep parsing, normalization, discovery, mutation planning, and filesystem writes in separate modules
- keep pure logic in small functions where practical
- avoid embedding filesystem reads and writes deep inside transformation logic
- pass filesystem operations through thin wrappers or modules so they can be replaced later in tests
- keep command handlers small and orchestration-focused
- avoid hidden global state

This does not mean building a heavy abstraction layer. It just means keeping boundaries clean enough that fixture tests can be added later without major rewrites.

### Recommended Package Shape

Possible initial structure:

- `packages/cli/src/bin.ts`
- `packages/cli/src/commands/apply.ts`
- `packages/cli/src/config/load.ts`
- `packages/cli/src/config/normalize.ts`
- `packages/cli/src/config/types.ts`
- `packages/cli/src/git/status.ts`
- `packages/cli/src/state/load.ts`
- `packages/cli/src/state/save.ts`
- `packages/cli/src/state/diff.ts`
- `packages/cli/src/discovery/android.ts`
- `packages/cli/src/discovery/ios.ts`
- `packages/cli/src/platforms/android/apply.ts`
- `packages/cli/src/platforms/android/manifest.ts`
- `packages/cli/src/platforms/ios/apply.ts`
- `packages/cli/src/platforms/ios/plist.ts`
- `packages/cli/src/platforms/ios/entitlements.ts`
- `packages/cli/src/platforms/ios/podfile.ts`
- `packages/cli/src/platforms/ios/xcode.ts`
- `packages/cli/src/fs/readWrite.ts`
- `packages/cli/src/reporting/summary.ts`

### Execution Strategy

Break the implementation into a small number of dependency-aware workstreams.

Workstreams:
- Foundation: package scaffolding, command entrypoint, config, filesystem boundaries, reporting
- Shared Apply Flow: preflight, git checks, state tracking, orchestration
- Android: discovery, manifest mutation, generated files, Android apply flow
- iOS Core: discovery, plist, entitlements, Podfile, generated files, iOS apply flow
- iOS Xcode: `project.pbxproj` mutation and target wiring
- Docs and release prep

Parallelism rules:
- Foundation tasks should land first because most later tasks depend on their module boundaries
- after Foundation is in place, Android and iOS Core can proceed mostly in parallel
- Shared Apply Flow can proceed in parallel with platform-specific mutation work once config types and filesystem boundaries exist
- iOS Xcode should start only after iOS discovery and iOS generated-file assumptions are stable
- Docs and release prep should happen after the CLI behavior is stable enough to describe accurately

### Detailed Tasks

Each task below is meant to be independently assignable. Dependencies are explicit so parallel work stays safe.

#### Foundation

**T1. Create `packages/cli` package scaffold**

Status:
- completed

Deliverables:
- create `packages/cli`
- add package manifest with `name: voltra`
- wire `bin` entry for `voltra`
- add CLI entrypoint with shebang
- wire build output for Node CLI usage

Notes:
- keep packaging independent from the React Native library build flow
- keep exports and runtime assumptions simple

Depends on:
- none

Can run in parallel with:
- nothing; this is the base task

**T2. Define config and normalized internal types**

Status:
- completed

Deliverables:
- define public config types
- define normalized config types used internally by apply logic
- define platform-specific normalized shapes for Android and iOS
- document which defaults mirror Expo behavior

Notes:
- keep normalized types stable so later tasks can build against them
- separate public config shape from internal resolved shape

Depends on:
- T1

Can run in parallel with:
- T3

**T3. Add filesystem boundary module**

Status:
- completed

Deliverables:
- add thin read/write helpers under `packages/cli/src/fs`
- add atomic-write helper where practical
- centralize path normalization helpers
- expose directory creation and delete helpers used by generated-file tasks

Notes:
- keep this thin; do not build a heavy virtual filesystem abstraction
- the goal is easy future test replacement, not indirection for its own sake

Depends on:
- T1

Can run in parallel with:
- T2

**T4. Add CLI reporting primitives**

Status:
- completed

Review follow-up:
- completed two review passes after T1-T4
- fixed `pathExists` to only swallow missing-path errors instead of hiding all filesystem failures
- cleaned up atomic write temp files on write or rename failure
- improved scaffolded CLI help and default error output so the published binary shows real usage shape

Deliverables:
- summary formatter for created/updated/deleted files
- warning formatter for dirty git state and ambiguous discovery
- error formatter for preflight failures

Notes:
- keep reporting decoupled from mutation logic

Depends on:
- T1

Can run in parallel with:
- T2
- T3

#### Config And Command Flow

**T5. Implement config loading with `cosmiconfig`**

Status:
- completed

Deliverables:
- support `package.json` `voltra` key
- support `.voltrarc*`
- support `voltra.config.*`
- support `--config <path>` override
- return loaded config plus `configDir`

Notes:
- all relative paths must ultimately resolve from `projectRoot`
- fail clearly when no config is found

Depends on:
- T1
- T2

Can run in parallel with:
- T6
- T7

**T6. Implement config normalization**

Status:
- completed

Deliverables:
- resolve defaults from loaded config
- derive `projectRoot`
- resolve relative paths
- normalize per-platform config for downstream apply tasks

Notes:
- normalization should be pure once raw config is loaded

Depends on:
- T2
- T5

Can run in parallel with:
- T7

**T7. Implement `voltra apply` command shell**

Status:
- completed

Deliverables:
- parse flags
- route to `apply`
- support `--platform ios|android`
- support `--config`
- return structured exit codes for success vs failure

Notes:
- keep command handler thin
- actual work should live in orchestration modules

Depends on:
- T1
- T4

Can run in parallel with:
- T5

#### Shared Apply Flow

**T8. Implement git worktree checks**

Deliverables:
- detect dirty worktree
- support interactive warn-and-confirm flow
- support non-interactive fail-fast behavior unless bypassed
- expose a clean API for apply orchestration

Notes:
- interactive prompting should stay out of mutation code

Depends on:
- T1
- T4

Can run in parallel with:
- T5
- T6
- T7

**T9. Implement Voltra state load/save/diff**

Status:
- completed

Deliverables:
- load `.voltra/state.json` if present
- validate minimal schema
- diff `previous.files` vs `next.files`
- save new state only after success

Notes:
- state tracks only Voltra-owned generated files
- no shared-file mutation history

Depends on:
- T2
- T3

Can run in parallel with:
- T10
- T11

**T10. Implement apply preflight orchestration**

Status:
- completed

Deliverables:
- gather requested platforms
- run discovery for all requested platforms before writes
- collect missing/ambiguous artifact failures
- abort before writes if any preflight check fails

Notes:
- this is the safety boundary that prevents partial writes across platforms

Depends on:
- T6
- T7
- T8

Can run in parallel with:
- T9
- T11

**T11. Implement top-level apply pipeline**

Deliverables:
- sequence load config, normalize, git check, preflight, state load, platform apply, stale cleanup, state write, summary output
- ensure no state write happens on failure
- ensure stale files are deleted only after successful writes/mutations

Notes:
- this task should wire existing modules together, not reimplement platform logic

Depends on:
- T6
- T7
- T8
- T9
- T10

Can run in parallel with:
- platform implementation tasks, once interfaces are known

#### Android Workstream

**T12. Implement Android project discovery**

Status:
- completed

Deliverables:
- discover Android root
- discover app module
- discover manifest path
- resolve configurable overrides for nonstandard layouts
- return a stable Android discovery result for downstream tasks

Notes:
- fail clearly on missing expected structure

Depends on:
- T2
- T3
- T6

Can run in parallel with:
- T13
- T14

**T13. Adapt reusable Android generated-file logic for CLI use**

Status:
- completed

Deliverables:
- wire current Android generators behind CLI-friendly inputs
- define generated file inventory output so state tracking can capture all owned files
- keep generator calls independent from CLI command concerns

Notes:
- reuse only pure or low-risk generation code

Depends on:
- T2
- T3
- T6

Can run in parallel with:
- T12
- T14

**T14. Implement CLI-native Android manifest mutator**

Status:
- completed

Deliverables:
- parse `AndroidManifest.xml`
- ensure required permissions
- ensure widget receivers
- ensure metadata/resource links
- preserve unrelated content and avoid duplicate insertions

Notes:
- use XML parsing, not fragile string replacement

Depends on:
- T2
- T3
- T6

Can run in parallel with:
- T12
- T13

**T15. Implement Android apply flow**

Status:
- completed

Deliverables:
- combine discovery, manifest mutation, generated-file writes, and generated-file list emission
- return created/updated file inventory for reporting and state tracking
- keep shared-file mutations and generated-file writes clearly separated in code

Notes:
- this is the Android platform entrypoint used by top-level apply orchestration

Depends on:
- T12
- T13
- T14

Can run in parallel with:
- iOS Core tasks

#### iOS Core Workstream

**T16. Implement iOS project discovery**

Status:
- completed

Deliverables:
- discover iOS root
- discover `.xcodeproj`
- discover main target candidates
- discover main `Info.plist`
- discover Podfile
- support explicit overrides for ambiguous projects

Notes:
- fail clearly when discovery is ambiguous instead of guessing

Depends on:
- T2
- T3
- T6

Can run in parallel with:
- T17
- T18
- T19

**T17. Adapt reusable iOS generated-file logic for CLI use**

Status:
- completed

Deliverables:
- wire widget extension file generation behind CLI-friendly inputs
- define generated file inventory output for state tracking
- keep pure file generation separate from Xcode mutation

Notes:
- include Swift files, widget plist, entitlements, assets, and localized strings where applicable

Depends on:
- T2
- T3
- T6

Can run in parallel with:
- T16
- T18
- T19

**T18. Implement CLI-native plist and entitlements mutators**

Status:
- completed

Deliverables:
- parse and update main app `Info.plist`
- parse and update entitlements
- ensure required keys are inserted or updated without duplicates
- preserve unrelated content

Notes:
- use plist parse/build APIs, not raw string mutation

Depends on:
- T2
- T3
- T6

Can run in parallel with:
- T16
- T17
- T19

**T19. Implement Podfile managed block mutation**

Status:
- completed

Deliverables:
- insert or update a Voltra-managed block for widget extension pods
- keep unrelated Podfile content intact
- make repeated runs idempotent

Notes:
- keep the managed block narrow and obvious to users

Depends on:
- T3
- T6

Can run in parallel with:
- T16
- T17
- T18

**T20. Implement iOS Core apply flow**

Status:
- completed

Deliverables:
- combine iOS discovery, generated-file writes, plist mutation, entitlements mutation, and Podfile mutation
- emit generated file inventory for state tracking
- keep Xcode mutation out of this task

Notes:
- this task should produce a working iOS core path before `project.pbxproj` mutation exists

Depends on:
- T16
- T17
- T18
- T19

Can run in parallel with:
- T15

#### iOS Xcode Workstream

**T21. Implement Xcode project parsing and target discovery helpers**

Status:
- completed

Deliverables:
- parse `project.pbxproj` via `@bacons/xcode`
- identify main app target and required groups/build phases
- expose stable helper functions for downstream target mutation

Notes:
- do not tie this to command orchestration

Depends on:
- T16

Can run in parallel with:
- late Android polishing or docs work

**T22. Implement widget target creation/update in Xcode project**

Deliverables:
- ensure widget extension target exists
- ensure product file, build phases, groups, and dependencies are present
- make repeated runs idempotent
- preserve unrelated project structure

Notes:
- this is the highest-risk mutation task and should stay narrowly scoped

Depends on:
- T17
- T21

Can run in parallel with:
- T23

**T23. Integrate Xcode mutation into iOS apply flow**

Deliverables:
- add `project.pbxproj` mutation to iOS apply flow
- ensure generated-file paths and target references stay aligned
- include Xcode changes in final reporting

Notes:
- this converts iOS Core into the full iOS path for v1

Depends on:
- T20
- T22

Can run in parallel with:
- T24

#### Docs And Release Prep

**T24. Write CLI docs and usage examples**

Deliverables:
- document config file locations
- document `voltra apply`
- document `--platform` and `--config`
- document discovery conventions and override points
- document dirty-worktree behavior
- document generated-file ownership and `.voltra/state.json`

Notes:
- docs should describe current behavior only; do not document speculative future commands

Depends on:
- T11
- T15
- T20

Can run in parallel with:
- T23

### Suggested Phases

If sequencing work across multiple people, use these phases.

**Phase 1: Foundation**
- T1
- T2
- T3
- T4
- T5
- T6
- T7
- T8
- T9

**Phase 2: Shared And Platform Parallel Work**
- T10
- T11
- T12
- T13
- T14
- T16
- T17
- T18
- T19

**Phase 3: First End-To-End Paths**
- T15
- T20

**Phase 4: iOS Xcode Completion**
- T21
- T22
- T23

**Phase 5: Docs And Release Prep**
- T24

### Critical Path

The minimum dependency path to a shippable CLI is:

1. T1
2. T2
3. T5
4. T6
5. T7
6. T8
7. T10
8. T9
9. T11
10. T12
11. T13
12. T14
13. T15
14. T16
15. T17
16. T18
17. T19
18. T20
19. T21
20. T22
21. T23
22. T24

Android can ship earlier internally, but v1 is not complete until iOS Xcode mutation is integrated.

### Main Risks

- Xcode mutation remains the hardest part
- Podfile mutation can still be brittle
- CLI defaults can drift from Expo behavior if not kept aligned
- iOS project discovery can be ambiguous in nontrivial apps
- config loading across many file formats increases public support surface

### Guiding Principle

Prefer the smaller solution unless extra complexity clearly improves safety.

In practice, that means:
- minimal state file
- one public command in v1
- duplicated CLI-native mutators where needed
- reuse only pure helpers and generators
- no generalized mutation engine
- no rollback system
- no extra state metadata unless it becomes clearly necessary
