---
'@use-voltra/ios-client': minor
---

Add an optional `kind` to iOS widget configs. It overrides the WidgetKit kind (default
`Voltra_Widget_<id>`), so a widget migrated from a hand-written WidgetKit extension keeps
its identity and stays on users' Home Screens instead of turning into a placeholder. The
override is written to both Info.plists as `Voltra_WidgetKinds` and used for timeline
reloads, `getActiveWidgets`, and orphaned-data cleanup.
