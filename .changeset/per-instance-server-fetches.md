---
'@use-voltra/android-client': minor
'@use-voltra/ios-client': minor
'@use-voltra/core': minor
---

Server-driven Dynamic Widgets now fetch, cache, and store props per placement
instead of per widget. When a widget has configuration parameters (Android
instance configuration, or the iOS Edit Widget sheet), every request now
carries the placement's merged configuration as `instance` (a stable hash) and
`configuration` (canonical JSON) query parameters, so a backend can answer a
London placement and a New York placement of the same widget differently from
one endpoint. Two placements with identical configuration share one fetch, one
cached response, and one props slot, so fetch count scales with the number of
distinct configurations, not the number of placements. `env.instance` carries
the same hash to the widget, and is `undefined` for a widget with no
configuration parameters — which keeps sending the same request and sharing
the same props slot exactly as it did before. `instance` and `configuration`
join the reserved query keys `setWidgetServerUpdate` rejects.
