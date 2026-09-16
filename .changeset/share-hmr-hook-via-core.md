---
'@use-voltra/core': patch
'@use-voltra/ios': patch
'@use-voltra/android': patch
'@use-voltra/ios-client': patch
'@use-voltra/android-client': patch
---

The hot-reload hook used by both platforms is now a single shared implementation in
@use-voltra/core, re-exported by the iOS and Android packages instead of being duplicated in
each client. No API changes for apps.
