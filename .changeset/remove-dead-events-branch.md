---
'@use-voltra/android-client': patch
---

The repeated support warning in the Android client's event subscription helper no longer hides
behind a dead platform branch that returned the same result on every platform. The warning text,
the returned no-op subscription, and the API are unchanged.
