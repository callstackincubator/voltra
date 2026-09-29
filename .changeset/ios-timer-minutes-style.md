---
'@use-voltra/ios': minor
'@use-voltra/ios-client': minor
---

`Timer` accepts `textStyle: 'minutes'` to show a live countdown or count-up without
seconds (for example "19 minutes"). It still updates on its own in Live Activities and
widgets. It requires iOS 18; earlier versions fall back to the default `'timer'` style.
