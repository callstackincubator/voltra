---
'@use-voltra/android': minor
'@use-voltra/android-client': minor
'@use-voltra/android-server': patch
---

Android ongoing notifications now cover the Android 16 Live Updates surface. `chronometer`
accepts `'countDown'` (with `when`) so the status-bar chip can count remaining time,
promotion requests reach the system even before the user enables Live Updates, and results
report promotion eligibility as machine-readable reasons. New helpers:
`checkAndroidOngoingNotificationPromotion()` pre-flights a payload without posting, and
`openAndroidPromotedNotificationSettings()` opens the Live Updates settings page. Posting
now rejects with coded errors (`VOLTRA_NOTIFICATION_...`) for a missing or unknown channel,
a malformed remote payload, or — with `fallbackBehavior: 'error'` — an ineligible promoted
notification, instead of failing silently or leaking raw exceptions. In
`useAndroidOngoingNotification`, an `autoStart` or `autoUpdate` that now rejects (for those
same coded reasons) is reported through `console.error` instead of surfacing as an
unhandled promise rejection.
