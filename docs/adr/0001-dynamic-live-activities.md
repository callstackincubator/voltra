# ADR 0001: Dynamic Live Activities rendering

## Introduction

Live Activities currently use a server-rendered engine that serializes the complete UI into every update payload. The new dynamic engine will bundle Live Activity definitions with the app and send only their props in updates, reducing payload size and moving rendering onto the device.

Unlike Home Screen widgets, Live Activities can be started and updated through ActivityKit push notifications. Pushes may reach older app releases or releases that do not contain the requested definition. The rollout must therefore support both engines and reject unsupported dynamic activities without crashing the app or widget extension.

## Context

The existing `VoltraAttributes` and `VoltraWidget` configuration decode a compressed, fully rendered UI. Changing their payload contract would risk breaking active Live Activities and older app releases.

Dynamic Live Activities need a stable ActivityKit contract that is distinct from the legacy engine. Each definition is declared in app configuration with a stable ID and an entry module. It receives a generated ActivityKit type while reusing the shared rendering runtime.

Dynamic definitions are configured alongside Home Screen widgets:

```json
{
  "liveActivities": [
    {
      "id": "order_finished",
      "entry": "./live-activities/order-finished.tsx"
    }
  ]
}
```

Only Dynamic Live Activities require declarations. Existing server-rendered Live Activities remain undeclared.

Definition IDs follow the existing widget ID rule: they contain only alphanumeric characters and underscores. They must be unique within the Dynamic Live Activity collection.

Configuring at least one Dynamic Live Activity requires `groupIdentifier`. Prebuild validation fails when `liveActivities` is non-empty and no App Group is configured.

For V1, props are an opaque JSON-compatible record. Voltra assumes that producers send the complete and correct props expected by the selected definition. Definition-specific prop schemas, generated prop types, and runtime prop validation are out of scope.

## Decision

- Keep the legacy engine, `VoltraAttributes`, payload format, APIs, and `VoltraWidget` configuration unchanged.
- Generate one `ActivityAttributes` type and matching ActivityKit configuration for each declared Dynamic Live Activity. Convert its underscore-delimited ID to UpperCamelCase and use `Voltra<DefinitionId>LiveActivityAttributes` as the type name; for example, `order_finished` becomes `VoltraOrderFinishedLiveActivityAttributes`. Fail prebuild if two IDs produce the same generated type name.
- Have every generated attributes type reuse the same generic content-state implementation. Store the current props record directly under `props`; each update replaces the complete props record. Encode it as a JSON object in ActivityKit payloads and serialize it only when crossing into the JavaScript runtime. Static attributes contain the activity name and optional deep link; the generated type and configuration identify the definition.
- Generate a catalog and bundled entry for every Dynamic Live Activity declared in app configuration. Each generated ActivityKit configuration passes its definition ID to the shared renderer.
- Keep Dynamic Live Activity definitions in a namespace separate from Dynamic Widgets: a separate manifest collection, Metro bundle route, runtime registry, and release asset prefix. IDs are unique within each collection, so a Dynamic Widget and Dynamic Live Activity may share an ID. Reuse the underlying JavaScript runtime and rendering primitives.
- Support the same development model as Dynamic Widgets: load definitions from the dedicated Metro route in debug builds, bundle them as release assets, and use Fast Refresh to invalidate the changed definition and re-render active Dynamic Live Activities that use it.
- Define each entry as a function of `(props, environment)` that returns the complete existing `LiveActivityVariants` shape. The on-device renderer resolves all declared Lock Screen, Dynamic Island, and supplemental-family variants from that result.
- Define `LiveActivityEnvironment` by reusing `date`, `colorScheme`, `locale`, `widgetRenderingMode`, and `build` from `WidgetEnvironment`, and adding ActivityKit's `isStale` and optional `activityFamily`. Do not expose Home Screen-only `widgetFamily`, `showsWidgetContainerBackground`, or `configuration` fields.
- Use the generated attributes type in the push-to-start payload. An app release that does not contain that definition's type and ActivityKit configuration does not accept the push, including an older release that supports other Dynamic Live Activities.
- Reject missing catalog entries or bundled resources before local creation. For remotely started activities, or failures discovered after creation, log the failure, render `EmptyView`, and keep the activity active so a later update can recover it. V1 does not cache the last successfully rendered UI.
- Add explicit `useDynamicLiveActivity`, `startDynamicLiveActivity`, and `updateDynamicLiveActivity` client APIs. Do not overload the legacy `useLiveActivity`, `startLiveActivity`, or `updateLiveActivity` APIs. Update APIs are engine-specific: when an activity name belongs to the other engine, reject with a renderer-mismatch error instead of reporting that the activity was not found. Ending and shared lifecycle operations work across both engines.
- Add `getDynamicLiveActivityDefinitionIds()` to return the definition IDs bundled in the installed release. Applications can register this capability list alongside the unchanged app-wide push-to-start token.
- Export the generic dynamic props and content-state TypeScript types for server use. Also export `getDynamicLiveActivityAttributesType(definitionId)` so push producers use the same generated UpperCamelCase type name as prebuild. Do not add a dynamic render or payload-construction helper in V1 because props are inserted directly into ActivityKit's `content-state` without rendering, compression, or transformation.
- Validate the encoded attributes and content state against the existing ActivityKit 4 KB limit before local dynamic starts and updates. Reject oversized local operations before calling ActivityKit. Server producers remain responsible for the size of their complete APNs payloads.
- Generate the ActivityKit configuration and per-activity lifecycle and update-token observation needed by each declared type. Keep the single existing app-wide push-to-start token observer. Manage the legacy type and generated dynamic types separately while presenting a unified public lifecycle API where appropriate.
- Keep the existing push-to-start and per-activity update-token event contracts unchanged. Push-to-start uses the existing app-wide token, while an update token already targets one activity instance and is associated with its existing activity name. Applications and servers may track renderer and supported-definition capabilities separately when routing pushes.
- Encapsulate the cross-target native implementation under a dedicated `packages/ios-client/ios/shared/dynamic-live-activity/` directory compiled into both the app and widget extension. Keep feature-specific attributes, catalog lookup, runtime coordination, and payload handling there instead of spreading them through the legacy Live Activity implementation.
- Record rendering failures in a dedicated App Group queue capped at 100 events, dropping the oldest event when full and performing no deduplication in V1. Notify the app process after persisting a failure so a running app can drain the queue without polling; also drain it when listeners are established and when the app enters the foreground. Flush failures through the existing JavaScript event path without allowing them to displace persistent interaction events. Expose failures as `dynamicLiveActivityRenderFailed` events through the native `onDynamicLiveActivityRenderFailed` emitter and `addVoltraListener`. Failure events reuse the common `type`, `source`, and `timestamp` properties, set `source` to the activity name, and add `activityName`, `definitionId`, and a sanitized `message`; they do not include a separate stage, props, tokens, or other payload data. Also write the failure to `OSLog` for local diagnostics.
- Require an App Group for Dynamic Live Activities so the widget extension can persist failure events and the app can flush them reliably.
- Treat Dynamic Live Activities and their public APIs as experimental in V1.

The Voltra-specific ActivityKit payload fields are:

```json
{
  "attributes-type": "VoltraOrderFinishedLiveActivityAttributes",
  "attributes": {
    "name": "order-123",
    "deepLinkUrl": "myapp://orders/123"
  },
  "content-state": {
    "props": {
      "status": "delivering"
    }
  }
}
```

`deepLinkUrl` is optional. Update and end pushes omit the static attributes and replace the complete `content-state.props` record. Standard ActivityKit fields such as timestamps, alerts, stale dates, relevance scores, dismissal dates, and channel fields retain their existing behavior.

## Compatibility and edge cases

- **Older app release:** A dynamic push-to-start references the generated attributes type for its definition. A release that does not contain that exact type and ActivityKit configuration does not create the activity, even if it supports other Dynamic Live Activities.
- **Definition missing from app configuration:** The release does not contain the definition's generated attributes type, configuration, catalog entry, or bundle. ActivityKit does not create an activity from a push that names that type, and local APIs reject the unknown ID.
- **Definition removed in a later release:** Definitions must remain bundled while activities using them may still be active. Otherwise those activities must be ended before the definition is removed.
- **Props change between releases:** A definition ID represents a stable rendering and props contract. A breaking props change requires a new definition ID, such as `order_finished_v2`. V1 does not validate props and treats incompatible props sent under the same ID as producer error.
- **Dynamic update:** The ActivityKit update token already identifies the activity instance, and its generated attributes type identifies the definition. Update payloads contain only the new complete props record.
- **Name collision between engines:** Local starts retain the existing replacement behavior and end activities with the same name across both engines when replacement is enabled. ActivityKit handles remote push-to-start without running this logic and may create activities with duplicate names. Voltra does not add duplicate detection or reconciliation for remote starts in V1.
- **Wrong update API:** Updating a dynamic activity through the legacy API, or a legacy activity through the dynamic API, fails with a renderer-mismatch error. No update is applied.
- **Mixed-version broadcast channel:** A broadcast cannot tailor its payload per recipient. Dynamic activities must use a channel whose recipients support the same definition; otherwise the channel remains on the legacy format.
- **Missing or corrupt generated bundle:** Local starts reject a missing resource. If a remotely started or existing activity reaches rendering without a usable bundle, the widget extension renders no content and records a failure without crashing.
- **Late runtime failure:** A failure after ActivityKit creates the activity cannot retroactively reject the start. The activity remains active but renders no content until a later render succeeds or the activity ends.

## Consequences

- Legacy and dynamic Live Activities can coexist during rollout without changing the existing payload format.
- Each definition adds a generated native ActivityKit type, configuration, per-activity observer, catalog entry, and bundle while reusing shared content-state and rendering code. The app-wide push-to-start token observer remains shared.
- Native lifecycle management must cover `Activity<VoltraAttributes>` and every generated Dynamic Live Activity type.
- Applications and servers that route both payload formats must associate activity names and app capabilities with the unchanged token events.
- V1 deliberately provides no guarantee that a props record matches the entry's TypeScript expectations.
- Render failures are observable on the next app run, but delivery is diagnostic and does not change the activity lifecycle.
- Dynamic Live Activities require the additional App Group configuration and entitlement even when their props arrive exclusively through ActivityKit pushes.

## Alternatives considered

### Extend `VoltraAttributes` with both payload formats

Rejected because it weakens the compatibility boundary and changes the decoder used by existing Live Activities.

### Use one shared Dynamic Live Activity attributes type

Rejected because an older app release that knows the shared type would accept a push for a definition introduced in a later release. A generated type per definition lets ActivityKit reject that push before creating an unsupported activity.

### Include legacy and dynamic representations in every push

Rejected because it increases payload size, makes renderer selection ambiguous, and undermines the main benefit of the dynamic engine.

### Validate definition-specific props in V1

Deferred. V1 accepts a generic JSON-compatible record and assumes the producer follows the definition's contract.
