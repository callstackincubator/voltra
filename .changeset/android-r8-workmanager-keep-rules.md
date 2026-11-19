---
'@use-voltra/android-client': patch
---

Fixes a launch crash (`Failed to create an instance of class
androidx.work.impl.WorkDatabase.canonicalName`) in R8-minified Android release
builds where R8 strips the constructors WorkManager creates by reflection, such
as builds with `android.r8.strictFullModeForKeepRules=true`. Voltra now ships
keep rules for them.
