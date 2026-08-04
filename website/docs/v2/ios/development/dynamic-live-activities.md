# Dynamic Live Activities

:::warning Experimental feature

Dynamic Live Activities and their public APIs are experimental in V1. They are separate from both legacy Live Activities and [Dynamic Widgets](./dynamic-widgets): they have their own configuration collection, generated ActivityKit types, Metro route, runtime registry, and release bundles.

:::

A legacy Live Activity sends a fully rendered Voltra UI in every update. A Dynamic Live Activity bundles its rendering definition in the app and receives only a complete, JSON-compatible props record. This keeps update payloads small, but makes the definition ID and its props contract a compatibility boundary between the app and the push producer.

## Configure a definition

Install the iOS packages and `@use-voltra/metro`, then wrap the app Metro configuration as shown in [Dynamic Widgets: Set up Metro](./dynamic-widgets#set-up-metro). Declare each Dynamic Live Activity in the iOS Voltra plugin. An App Group is mandatory, even if updates arrive only through ActivityKit pushes, because the extension uses it to deliver diagnostic render failures to the app.

```json title="app.json"
{
  "expo": {
    "ios": { "bundleIdentifier": "com.example.orders" },
    "plugins": [
      [
        "@use-voltra/ios-client",
        {
          "groupIdentifier": "group.com.example.orders",
          "enablePushNotifications": true,
          "liveActivities": [
            {
              "id": "order_finished",
              "entry": "./live-activities/order-finished.tsx"
            }
          ]
        }
      ]
    ]
  }
}
```

IDs contain only letters, numbers, and underscores. They are unique only within `liveActivities`, so a Dynamic Widget may use the same ID. Run Expo Prebuild (or Voltra Apply) and make a new native build after changing this configuration.

The generated ActivityKit attributes type turns underscores into UpperCamelCase. The declaration above produces `VoltraOrderFinishedLiveActivityAttributes`; this exact name is required for a push-to-start payload.

## Write the entry

The entry must default-export a function with the signature `(props, environment) => LiveActivityVariants`. It returns the same Lock Screen, Dynamic Island, and optional supplemental-family shape as a legacy Live Activity.

```tsx title="live-activities/order-finished.tsx"
import { Voltra, type LiveActivityEnvironment } from '@use-voltra/ios'

type OrderFinishedProps = {
  orderNumber?: string
  status?: string
}

export default function OrderFinished(
  props: OrderFinishedProps = {},
  environment: LiveActivityEnvironment
) {
  return {
    lockScreen: (
      <Voltra.VStack style={{ padding: 16 }}>
        <Voltra.Text>Order #{props.orderNumber ?? '123'}</Voltra.Text>
        <Voltra.Text>{props.status ?? 'Preparing'}</Voltra.Text>
        {environment.isStale ? <Voltra.Text>Status may be outdated</Voltra.Text> : null}
      </Voltra.VStack>
    ),
    island: {
      compact: {
        leading: <Voltra.Text>Order</Voltra.Text>,
        trailing: <Voltra.Symbol name="bag.fill" />,
      },
    },
  }
}
```

`LiveActivityEnvironment` provides `date`, `colorScheme`, `locale`, `widgetRenderingMode`, `build`, `isStale`, and, for applicable iOS 18+ activity families, `activityFamily`. It deliberately does not expose Home Screen widget fields such as `widgetFamily`, `showsWidgetContainerBackground`, or `configuration`.

Props are opaque in V1. They must be a complete JSON-compatible object (strings, finite numbers, booleans, `null`, arrays, and plain nested objects). Each update replaces the whole record; it does not merge it. Voltra does not generate definition-specific prop types or validate that the producer supplied the props this entry expects.

## Start and update locally

Use the explicit Dynamic APIs—do not use `startLiveActivity`, `updateLiveActivity`, or `useLiveActivity` for a bundled definition.

```tsx
import {
  getDynamicLiveActivityDefinitionIds,
  startDynamicLiveActivity,
  updateDynamicLiveActivity,
  useDynamicLiveActivity,
} from '@use-voltra/ios-client'

const activityId = await startDynamicLiveActivity(
  'order_finished',
  { orderNumber: '123', status: 'Preparing' },
  { activityName: 'order-123', deepLinkUrl: 'myapp://orders/123' }
)

await updateDynamicLiveActivity(activityId, {
  orderNumber: '123',
  status: 'Ready for pickup',
})

const availableDefinitions = await getDynamicLiveActivityDefinitionIds()

// In a React component:
const activity = useDynamicLiveActivity('order_finished', { orderNumber: '123', status: 'Preparing' }, {
  activityName: 'order-123',
  autoStart: true,
  autoUpdate: true,
})
```

The hook’s auto-update also sends the complete latest props object. `stopLiveActivity`, `endAllLiveActivities`, active-state checks, and shared lifecycle operations work across both engines. Updating through the wrong engine-specific API fails with a renderer-mismatch error. Local starts keep the existing replacement behavior: when replacement is enabled, an existing activity with the same name is ended across both engines.

For Fast Refresh in development, keep the generated host-graph import and enable targeted reload once at app startup:

```ts
import '@use-voltra/live-activity-hot-reload'
import { enableDynamicLiveActivityHotReload } from '@use-voltra/ios-client'

enableDynamicLiveActivityHotReload()
```

The changed definition alone is reloaded. A development bundle is served from `/voltra/live-activities/<id>.bundle`; release bundles use the separate `voltra-live-activity-<id>.bundle` asset prefix.

## Remote updates and payloads

Push-to-start requires the generated type name in `attributes-type`. For `order_finished`, the Voltra-specific ActivityKit fields are exactly:

```json
{
  "attributes-type": "VoltraOrderFinishedLiveActivityAttributes",
  "attributes": {
    "name": "order-123",
    "deepLinkUrl": "myapp://orders/123"
  },
  "content-state": {
    "props": {
      "orderNumber": "123",
      "status": "Preparing"
    }
  }
}
```

`deepLinkUrl` is optional. Update and end pushes omit static `attributes`; an update replaces the complete `content-state.props` record. Standard ActivityKit/APNs fields—including timestamps, alerts, stale dates, relevance scores, dismissal dates, and channel fields—continue to use their normal semantics.

For server producers, `DynamicLiveActivityProps`, `DynamicLiveActivityContentState`, and `getDynamicLiveActivityAttributesType(definitionId)` are exported from both `@use-voltra/ios` and `@use-voltra/ios-server`. V1 intentionally has no dynamic render or payload-construction helper: props go directly into ActivityKit content state.

Voltra checks the existing 4 KB ActivityKit limit for encoded attributes plus state on a local start, and for encoded content state on a local update. A server producer remains responsible for the size of its complete APNs payload.

Existing `activityPushToStartTokenReceived` and `activityTokenReceived` event contracts do not change. The former remains app-wide; an update token already targets its activity instance and carries its existing activity name. Register `getDynamicLiveActivityDefinitionIds()` alongside the unchanged push-to-start token so your server can route the correct engine and definition.

Rendering failures are diagnostic events, delivered as `dynamicLiveActivityRenderFailed` through `addVoltraListener`. Each event includes the common `type`, `source`, and `timestamp` fields plus `activityName`, `definitionId`, and a sanitized `message`; it never includes props or tokens.

```ts
import { addVoltraListener } from '@use-voltra/ios-client'

const subscription = addVoltraListener('dynamicLiveActivityRenderFailed', (event) => {
  console.warn(`Could not render ${event.definitionId} for ${event.activityName}: ${event.message}`)
})
```

## Rollout and compatibility

- An older app can only accept a push-to-start for a definition whose generated attributes type and ActivityKit configuration it contains. Supporting another Dynamic Live Activity is not enough.
- An undeclared definition has no generated type, configuration, catalog entry, or bundle; local APIs reject it and ActivityKit does not create it remotely.
- Keep a definition bundled until all activities using it have ended. End active instances before removing its declaration.
- Treat an ID as a versioned rendering-and-props contract. Use a new ID such as `order_finished_v2` for breaking prop changes; incompatible props under the old ID are producer error.
- A broadcast channel cannot tailor format per recipient. Use Dynamic Live Activities only on channels whose recipients support the same definition; otherwise retain the legacy format.
- A missing/corrupt bundle or late renderer failure leaves a remotely created activity active but empty, records a failure, and can recover on a later successful update. V1 does not cache the last successful UI.
- ActivityKit can create duplicate remote starts with the same name; V1 does not reconcile them. This differs from local replacement behavior.
