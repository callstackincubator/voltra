# Performance

Voltra provides automatic optimizations to help you create efficient Live Activities, but following these best practices will ensure optimal performance and stay within ActivityKit's payload size limits.

## Element deduplication

Reuse JSX elements by creating them once, storing them in variables, and reusing them across your JSX tree. Voltra automatically detects duplicate element references and stores them only once in the payload, using lightweight references (`{ $r: index }`) for subsequent occurrences.

```tsx
import { Voltra } from 'voltra'

// ✅ Good: Create element once and reuse
const sharedButton = <Voltra.Button onPress="action">Click me</Voltra.Button>
const sharedIcon = <Voltra.Symbol name="star.fill" />

const variants = {
  lockScreen: (
    <Voltra.VStack>
      <Voltra.Text>Order Status</Voltra.Text>
      {sharedButton}
      {sharedIcon}
    </Voltra.VStack>
  ),
  island: {
    minimal: (
      <Voltra.HStack>
        {sharedIcon}
        {sharedButton}
      </Voltra.HStack>
    ),
  },
}
```

**Payload result:**

```json
{
  "v": 2,
  "e": [
    { "t": 1, "p": { "onPress": "action" }, "c": "Click me" },
    { "t": 2, "p": { "name": "star.fill" } }
  ],
  "ls": {
    "t": 11,
    "c": [{ "t": 0, "c": "Order Status" }, { "$r": 0 }, { "$r": 1 }]
  },
  "isl_min": {
    "t": 12,
    "c": [{ "$r": 1 }, { "$r": 0 }]
  }
}
```

**Benefits:**

- Eliminates redundant element serialization
- Can significantly reduce payload size for complex UIs
- Works across different Live Activity variants
- Automatic - no additional code required

```tsx
// ❌ Avoid: Creating separate element instances
const variants = {
  lockScreen: (
    <Voltra.VStack>
      <Voltra.Text>Order Status</Voltra.Text>
      <Voltra.Button onPress="action">Click me</Voltra.Button> // Duplicate instance
      <Voltra.Symbol name="star.fill" /> // Duplicate instance
    </Voltra.VStack>
  ),
  island: {
    minimal: (
      <Voltra.HStack>
        <Voltra.Symbol name="star.fill" /> // Another duplicate instance
        <Voltra.Button onPress="action">Click me</Voltra.Button> // Another duplicate instance
      </Voltra.HStack>
    ),
  },
}
```

## Image optimization

Images can significantly impact payload size. For comprehensive guidance on handling images in Live Activities, see the [Images](images) documentation, which covers:

- Base64 encoding for small static images
- Build-time asset copying for medium-sized images
- Runtime preloading for dynamic images

Choose the appropriate approach based on your image size, when it's known, and whether it changes dynamically.

## Reuse style objects

Reuse style objects and avoid inline styles when possible:

```tsx
// ✅ Good: Shared style objects
const buttonStyle = { padding: 8, borderRadius: 6 }
const textStyle = { fontSize: 14, color: '#666' }

<Voltra.VStack>
  <Voltra.Text style={textStyle}>Title</Voltra.Text>
  <Voltra.Button style={buttonStyle}>Action</Voltra.Button>
</Voltra.VStack>

// ❌ Avoid: Inline styles everywhere
<Voltra.VStack>
  <Voltra.Text style={{ fontSize: 14, color: '#666' }}>Title</Voltra.Text>
  <Voltra.Button style={{ padding: 8, borderRadius: 6 }}>Action</Voltra.Button>
</Voltra.VStack>
```
