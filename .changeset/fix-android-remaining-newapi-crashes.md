---
'@use-voltra/android-client': patch
---

Fixed two more crashes on older Android versions and a broken settings deep
link, found by turning on Android Lint's `NewApi` check:

- On Android 7.0–7.1 (API 24–25), registering the internal event receiver
  used the API 26-only `registerReceiver(receiver, filter, flags)` overload,
  crashing the host process with `NoSuchMethodError` the first time a
  listener was added. Registration now goes through
  `ContextCompat.registerReceiver`, which dispatches to the right mechanism
  for the running OS version.
- On Android 7.0–11 (API 24–30), a grid widget configured with an adaptive
  column size (`columns: "a:<n>"`) crashed on render because
  `GridCells.Adaptive` requires Android 12 (API 31). Those widgets now fall
  back to a 2-column fixed layout below API 31 instead of crashing.
- Calling the API that opens the promoted-notification settings screen threw
  on Android 7.0–7.1 (API 24–25), where no screen exists for that intent
  action. It now opens the app's details settings screen on those versions
  instead.
