---
'voltra': minor
---

Add Dynamic Widget code generation to `voltra apply` for React Native CLI projects.

Widgets declared in `voltra.config.*` with a project-relative `entry` path now emit the
platform Dynamic Widget manifests, placeholder initial states, native receiver/provider wiring,
and release bundle build steps needed to match the Expo config-plugin workflow.
