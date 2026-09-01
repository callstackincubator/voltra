---
'voltra': patch
---

`voltra apply` now handles apps whose Xcode project has more than one build
configuration. Projects that give each configuration its own entitlements file
or `Info.plist` are applied instead of rejected, each file keeps its own
configuration, and the generated widget extension takes its bundle identifier
and signing settings from the matching configuration of the app rather than
from the default one.
