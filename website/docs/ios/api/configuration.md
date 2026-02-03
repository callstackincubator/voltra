# Configuration

Voltra provides several configuration options to control Live Activity behavior, lifecycle, and appearance. These options can be used when starting, updating, or stopping Live Activities.

For Expo plugin configuration options (like `groupIdentifier`, `enablePushNotifications`, `deploymentTarget`, and `widgets`), see the [Plugin Configuration](./plugin-configuration) documentation.

## Dismissal Policy

Voltra supports configuring how Live Activities behave after they end. You can control the dismissal timing using the `dismissalPolicy` option:

### Dismissal Policy Options

- **`'immediate'`** (default): The Live Activity is dismissed immediately when it ends
- **`{ after: number }`**: The Live Activity remains visible for the specified number of seconds after ending, then automatically dismisses

### Usage Examples

**Immediate dismissal (default behavior):**

```typescript
import { startLiveActivity } from 'voltra/client'

await startLiveActivity(variants, {
  dismissalPolicy: 'immediate', // or omit for default
})
```

**Delayed dismissal (keep visible for 30 seconds after ending):**

```typescript
await startLiveActivity(variants, {
  dismissalPolicy: { after: 30 },
})
```

**Update dismissal policy for active Live Activities:**

```typescript
import { updateLiveActivity } from 'voltra/client'

await updateLiveActivity(activityId, variants, {
  dismissalPolicy: { after: 60 },
})
```

**Set dismissal policy when ending a Live Activity:**

```typescript
import { stopLiveActivity } from 'voltra/client'

await stopLiveActivity(activityId, {
  dismissalPolicy: { after: 10 },
})
```

The dismissal policy applies to both programmatic ending (`stopLiveActivity`) and natural ending (when timers reach their end time). This gives you fine-grained control over the user experience when Live Activities conclude.

## Additional Configuration Options

Voltra provides additional configuration options to control Live Activity behavior and appearance.

### Stale Date

The `staleDate` option allows you to specify when a Live Activity should be considered stale and automatically dismissed by the system.

```typescript
import { startLiveActivity } from 'voltra/client'

// Dismiss the Live Activity after 1 hour
await startLiveActivity(variants, {
  staleDate: Date.now() + 60 * 60 * 1000, // 1 hour from now
})
```

**Note:** If you provide a `staleDate` in the past, it will be ignored and the Live Activity will use default behavior.

### Relevance Score

The `relevanceScore` option helps iOS prioritize which Live Activities to display when space is limited. Higher scores (closer to 1.0) indicate more important activities.

```typescript
import { startLiveActivity } from 'voltra/client'

// High priority Live Activity (e.g., active delivery)
await startLiveActivity(variants, {
  relevanceScore: 0.8,
})

// Low priority Live Activity (e.g., background task)
await startLiveActivity(variants, {
  relevanceScore: 0.2,
})
```

**Valid range:** 0.0 to 1.0 (default: 0.0)

These options can be used together with dismissal policy and other configuration options:

```typescript
await startLiveActivity(variants, {
  dismissalPolicy: { after: 30 },
  staleDate: Date.now() + 2 * 60 * 60 * 1000, // 2 hours
  relevanceScore: 0.7,
})
```
