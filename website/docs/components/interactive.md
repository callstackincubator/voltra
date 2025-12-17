# Interactive Controls

The limited set of controls that work via AppIntents in Live Activities.

### Button

Triggers an action/intent when pressed.

**Parameters:** None

**Platform Requirements:** iOS 17.0+

:::warning
Buttons are only interactive on iOS 17.0+. On iOS 16.x, buttons will render but will not respond to taps.
:::

**Apple Documentation:** [Button](https://developer.apple.com/documentation/swiftui/button)

---

### Toggle

Toggles a boolean state via an intent.

**Parameters:**

- `defaultValue` (boolean, optional): Initial toggle state (default: `false`)

**Platform Requirements:** iOS 17.0+

:::warning
Toggles are only interactive on iOS 17.0+. On iOS 16.x, toggles will render with their initial state but cannot be changed by the user.
:::

**Apple Documentation:** [Toggle](https://developer.apple.com/documentation/swiftui/toggle)
