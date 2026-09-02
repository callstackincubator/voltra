---
'@use-voltra/android-client': patch
---

Fixed widget updates silently doing nothing on apps whose `applicationId`
differs from their Android `namespace`, as is the case for flavour-based
build variants and `applicationIdSuffix`. Receiver classes are generated into
the `namespace` package, but were looked up under the `applicationId`
returned by `Context.getPackageName()`, so `getActiveWidgets`,
`updateWidget`, the refresh action, the server-update worker and
`requestPinWidget` all addressed a class that does not exist. The receiver
class name is now read from the receivers the app actually declares.
