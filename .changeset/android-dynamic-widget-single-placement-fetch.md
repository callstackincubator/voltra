---
'@use-voltra/android-client': patch
---

Placing a server-driven Dynamic Widget no longer adds a second fetch from the server, including when the placement happens offline and the device reconnects later.
