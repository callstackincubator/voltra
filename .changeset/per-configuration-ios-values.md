---
'voltra': minor
---

`ios.groupIdentifier`, `ios.keychainGroup` and `ios.project.entitlementsPath`
now accept one value per Xcode build configuration, for apps that ship several
environments from the same project:

```ts
ios: {
  groupIdentifier: {
    Debug: 'group.com.example.app.dev',
    Release: 'group.com.example.app',
  },
}
```

`voltra apply` writes those values into the Xcode project as build settings on
the app and widget targets, so each build picks up the value for the
configuration it is built with. A single string keeps behaving exactly as
before.

The `ios` parameter of the exported iOS platform helpers is now
`ResolvedVoltraIOSConfig`, the shape those helpers already required: per-build
configuration values are resolved against the Xcode project before they reach
it.
