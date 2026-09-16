---
'@use-voltra/android-client': patch
---

The refresh button on a configured server-driven Dynamic Widget now refreshes the placement that
drew it. It previously fetched for the widget as a whole, so a placement configured for one value
received another's data and its `env.serverUpdate` never left `never`. Widgets with no
configuration parameters are unaffected.
