---
'@use-voltra/ios-client': patch
---

Harden the generated Podfile widget-target block.

The block is now delimited by `# @voltra-widget-target BEGIN/END` markers and upserted
idempotently (legacy unmarked blocks are migrated, renamed targets update in place). The
embedded Ruby raises an actionable error when `@use-voltra/ios-client` cannot be resolved
instead of generating a broken target, and the podspec path is canonicalized with
`File.realpath` so pnpm and bun symlinked installs resolve correctly.
