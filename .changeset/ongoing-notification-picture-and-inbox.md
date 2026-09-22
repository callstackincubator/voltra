---
'@use-voltra/android': minor
'@use-voltra/android-client': minor
'@use-voltra/android-server': minor
---

Ongoing notifications gained two layouts. `AndroidOngoingNotification.BigPicture` posts one image,
with `picture`, an optional collapsed `largeIcon` thumbnail, `bigLargeIcon` or
`hideLargeIconWhenExpanded` for the expanded state, `summaryText`, and the Android 12+
`showPictureWhenCollapsed` and `pictureContentDescription` options. `AndroidOngoingNotification.Inbox`
posts one to six short lines, with `text` defaulting to the first line. Both take action children,
both render on the server with `renderAndroidOngoingNotificationPayload`, and both are ignored rather
than fatal when the artwork cannot be decoded.

A `bigPicture` or `inbox` payload is selected by its `kind`, so a remote payload using either one
reaches only app builds that contain this release. Bundled drawables are handed to Android as
resources; decoded artwork is downscaled to 1024 px on the long edge for a picture and 256 px for an
icon before it is posted.
