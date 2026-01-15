# Interactions

Voltra components leverage Apple's ActivityKit to provide interactive Live Activities.

## Interaction capabilities

ActivityKit provides a limited set of interactions with Live Activities. The only interactable elements are:

- **Live Activity view**: Tapping anywhere on the Live Activity itself can launch your app via a deep link, allowing users to access more detailed information or perform specific actions.

- **Buttons**: Interactive buttons that can trigger actions within your app. Buttons are implemented using AppIntents and work on both the Lock Screen and Dynamic Island.

- **Toggles**: Interactive toggle switches that allow users to change boolean states. Like buttons, toggles use AppIntents and are supported across all Live Activity contexts.

These interactions are powered by Apple's AppIntents framework, which enables Live Activities to communicate with your app even when it's not running.

## Handling interactions

When a user interacts with a button or toggle in your Live Activity, Voltra automatically emits an event containing the identifier of the component that was interacted with. This allows your app to respond appropriately to specific user actions.

### Listening for events

To handle interactions, subscribe to Voltra UI events using the `addVoltraListener` function with the `'interaction'` event type:

```typescript
import { addVoltraListener } from 'voltra/client'

const subscription = addVoltraListener('interaction', (event) => {
  console.log('Component interacted:', event.identifier)
  console.log('Component type:', event.componentType)

  // Handle the interaction based on the identifier
  if (event.identifier === 'contact-driver') {
    // Open contact screen
  } else if (event.identifier === 'toggle') {
    // Handle toggle state change
  }
})

// Don't forget to clean up
subscription.remove()
```

### Event structure

Each interaction event contains:

- `identifier`: The unique identifier of the component that was interacted with (as specified in your JSX via the `id` prop)
- `componentType`: The type of component that triggered the event (e.g., "button", "toggle")

### Component identifiers

To receive interaction events, make sure your interactive components have unique identifiers:

```typescript
<Voltra.Button title="Contact driver" id="contact-driver" />
<Voltra.Toggle title="Enable notifications" id="notifications-toggle" />
```

If you don't provide an explicit `id` prop, Voltra will automatically generate a deterministic identifier based on the component's position in the tree. However, for reliable event handling, it's recommended to use explicit identifiers.

## Deep linking

When users tap on the Live Activity itself (not on a button or toggle), your app can be launched via a deep link. Configure the deep link URL when starting a Live Activity:

```typescript
import { useLiveActivity } from 'voltra/client'

const { start } = useLiveActivity(
  {
    lockScreen: <YourComponent />,
  },
  {
    activityName: 'activity-detail',
    deepLinkUrl: '/voltraui/activity-detail',
  }
)
```

The deep link URL can be:

- A full URL with a scheme (e.g., `myapp://activity-detail`)
- A path that will be prefixed with your app's URL scheme (e.g., `/activity-detail`)

When the Live Activity is tapped, your app will be launched (or brought to the foreground) and the deep link will be handled by your routing system.

## Limitations

While Live Activities provide powerful interaction capabilities, there are some limitations to be aware of:

- **Limited interactable elements**: Only buttons and toggles are supported as interactive components. Other UI elements like text fields, sliders, or custom controls are not available in Live Activities.

- **iOS version requirements**: Interactive buttons and toggles require iOS 17.0+. On iOS 16.x, these components will render but will not be interactive.

- **No real-time updates from interactions**: When a user interacts with a button or toggle, the Live Activity UI doesn't update automatically. You'll need to update the Live Activity content manually using the `update` function if you want to reflect state changes.

- **Event delivery timing**: Events are delivered asynchronously. There may be a slight delay between the user's interaction and your event handler being called, especially if the app needs to be launched.

## Example

Here's a complete example showing how to handle interactions:

```typescript
import { useEffect } from 'react'
import { useLiveActivity } from 'voltra/client'
import { Voltra } from 'voltra'
import { addVoltraListener } from 'voltra/client'

function MyLiveActivity() {
  const { start, update } = useLiveActivity(
    {
      lockScreen: (
        <Voltra.VStack>
          <Voltra.Text>Music Player</Voltra.Text>
          <Voltra.Button title="Play" id="play-button" />
          <Voltra.Button title="Pause" id="pause-button" />
          <Voltra.Toggle title="Shuffle" id="shuffle-toggle" />
        </Voltra.VStack>
      ),
    },
    {
      activityName: 'music-player',
      deepLinkUrl: '/music-player',
    }
  )

  useEffect(() => {
    const subscription = addVoltraListener('interaction', (event) => {
      switch (event.identifier) {
        case 'play-button':
          // Start playback
          console.log('Play button tapped')
          break
        case 'pause-button':
          // Pause playback
          console.log('Pause button tapped')
          break
        case 'shuffle-toggle':
          // Toggle shuffle mode
          console.log('Shuffle toggled')
          break
      }
    })

    return () => subscription.remove()
  }, [])

  return null
}
```
