---
'@use-voltra/android-client': patch
---

Fixed a crash on Android 7.0-11 (API 24-30) where updating a widget brought
down the whole host process with `NoSuchMethodError:
RemoteViews(Ljava/util/Map;)V`. Widgets on those versions now resolve a
single best-fit layout for the current portrait/landscape bounds instead of
relying on the Android 12+ size-mapping constructor.

Widgets configured with only `targetCellWidth`/`targetCellHeight` (no
explicit `minWidth`/`minHeight`) also declare a derived minimum size in their
provider info, so launchers on API 24-30 - where the target-cell attributes
are ignored - place them at the intended size instead of an arbitrary one.
