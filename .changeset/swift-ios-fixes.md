---
'voltra': patch
---

Fixed duplicate push-to-start token events being fired when a Live Activity starts or ends. Previously, iOS would re-deliver the same token on activity lifecycle changes, causing spurious token update callbacks to reach JavaScript. These duplicates are now suppressed.

Fixed image preloading to correctly propagate errors so callers receive accurate failure information when images cannot be downloaded or saved.
