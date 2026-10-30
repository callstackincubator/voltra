---
'@use-voltra/android-client': patch
---

Placing a server-driven Dynamic Widget now fetches from the server once instead of twice, including when the placement happens offline and the device reconnects later. Changing a server-driven Dynamic Widget's url, token or interval now fetches right away instead of after the old delay.
