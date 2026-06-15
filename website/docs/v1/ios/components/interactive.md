# Interactive Controls (iOS)

User interface controls that respond to user interaction in Live Activities.

---

## Button

An interactive button component that triggers in-app events via interaction intents.

**Parameters:**

- `buttonStyle` (string, optional): Visual style of the button:
  - `"automatic"` - System-determined style
  - `"bordered"` - Bordered style
  - `"borderedProminent"` - Bordered with prominent fill
  - `"plain"` - Plain style without border
  - `"borderless"` - Borderless style

**Apple Documentation:** [Button](https://developer.apple.com/documentation/swiftui/button)

**Availability:** iOS 17.0+ (interaction intents)

### Usage

Buttons fire interaction events that you can handle in your app:

```tsx
<Voltra.Button id="play-button" buttonStyle="borderedProminent">
  <Voltra.Text>Play Music</Voltra.Text>
</Voltra.Button>
```

Handle the event:

```typescript
import { addVoltraListener } from 'voltra/client'

const subscription = addVoltraListener('interaction', (event) => {
  if (event.identifier === 'play-button') {
    // Handle play action
  }
})
```

### Examples

**Styled button:**

```tsx
<Voltra.Button id="save-button" buttonStyle="borderedProminent">
  <Voltra.Text>Save Changes</Voltra.Text>
</Voltra.Button>
```

**Button with icon:**

```tsx
<Voltra.Button id="delete-button" buttonStyle="bordered">
  <Voltra.HStack spacing={6}>
    <Voltra.Symbol name="trash" size={16} />
    <Voltra.Text>Delete</Voltra.Text>
  </Voltra.HStack>
</Voltra.Button>
```

**Compact button:**

```tsx
<Voltra.Button id="like-button" buttonStyle="plain">
  <Voltra.Symbol name="heart.fill" tintColor="#FF3B30" size={20} />
</Voltra.Button>
```

---

## Link

A navigable link component that opens a URL when tapped. Uses SwiftUI's native Link for semantic navigation.

**Parameters:**

- `destination` (string, required): URL to navigate to when tapped. Supports both absolute URLs and relative paths.

**Apple Documentation:** [Link](https://developer.apple.com/documentation/swiftui/link)

**Availability:** iOS 14.0+

### URL Normalization

Link automatically normalizes URLs using your app's URL scheme:

- Absolute URLs: Used as-is (`"myapp://orders/123"`, `"https://example.com"`)
- Relative with `/`: `"/settings"` → `"myapp://settings"`
- Relative without `/`: `"help"` → `"myapp://help"`

### Examples

**Link with absolute URL:**

```tsx
<Voltra.Link destination="myapp://orders/123">
  <Voltra.HStack spacing={8}>
    <Voltra.Symbol name="bag.fill" tintColor="#F59E0B" size={20} />
    <Voltra.VStack spacing={2} alignment="leading">
      <Voltra.Text style={{ fontWeight: '600' }}>Order #123</Voltra.Text>
      <Voltra.Text style={{ fontSize: 12, color: '#9CA3AF' }}>Tap to view details</Voltra.Text>
    </Voltra.VStack>
  </Voltra.HStack>
</Voltra.Link>
```

**Link with relative path:**

```tsx
<Voltra.Link destination="/settings">
  <Voltra.HStack spacing={8}>
    <Voltra.Symbol name="gearshape.fill" tintColor="#8B5CF6" size={20} />
    <Voltra.Text>Open Settings</Voltra.Text>
  </Voltra.HStack>
</Voltra.Link>
```

**External link:**

```tsx
<Voltra.Link destination="https://example.com/support">
  <Voltra.HStack spacing={8}>
    <Voltra.Symbol name="globe" tintColor="#06B6D4" size={20} />
    <Voltra.Text>Visit Support Site</Voltra.Text>
  </Voltra.HStack>
</Voltra.Link>
```

### When to use Link vs Button

| Feature | Link | Button |
|---------|------|--------|
| **Use Case** | Navigation to URLs | In-app actions/events |
| **Visual** | Unstyled (custom via children) | Button styling (bordered, prominent, etc.) |
| **iOS Version** | 14.0+ | 17.0+ |
| **Tap Behavior** | Opens URL | Fires interaction event |
| **Mechanism** | SwiftUI Link | AppIntents (VoltraInteractionIntent) |

**Recommendation:** Use `Link` for navigation (e.g., list items, cards that open URLs). Use `Button` for actions that your app needs to handle (e.g., play/pause, save, delete).

---

## Toggle

Toggles a boolean state via an intent. Fires an interaction event when changed.

**Parameters:**

- `defaultValue` (boolean, optional): Initial toggle state (default: `false`)

**Apple Documentation:** [Toggle](https://developer.apple.com/documentation/swiftui/toggle)

**Availability:** iOS 17.0+

**Example:**

```tsx
<Voltra.Toggle id="notifications-toggle" defaultValue={true} />
```

Handle toggle events:

```typescript
import { addVoltraListener } from 'voltra/client'

const subscription = addVoltraListener('interaction', (event) => {
  if (event.identifier === 'notifications-toggle') {
    // Handle toggle state change
  }
})
```
