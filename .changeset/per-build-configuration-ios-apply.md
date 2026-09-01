---
'voltra': minor
---

`voltra apply` now handles apps whose Xcode project has more than one build
configuration. Projects that give each configuration its own entitlements file
or `Info.plist` are applied instead of rejected, each file keeps its own
configuration, and the generated widget extension takes its bundle identifier
and signing settings from the matching configuration of the app rather than
from the default one. A build configuration added to the app after the widget
exists is mirrored onto the widget, and signing settings the app no longer sets
are dropped from it.

Build configurations that disagree on the app version are now reported as a
warning, since the widget extension is generated with the version of the
default build configuration.

The `ensureEntitlements` and `ensureInfoPlist` exports now return
`{ changes: ReportedChange[] }` instead of `{ change?: ReportedChange }`, as
both can now write more than one file.
