# Flexbox Layout

:::warning Experimental Feature
Flexbox layout is a **new layout system** in Voltra. While it covers common use cases, you may encounter bugs or edge cases. Please [report any issues](https://github.com/callstackincubator/voltra/issues) you find.
:::

Voltra supports React Native-style flexbox layout through the `Voltra.View` component.

## Enabling Flexbox

Use `Voltra.View` to opt in to flexbox layout:

```tsx
<Voltra.View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
  <Voltra.Text>Left</Voltra.Text>
  <Voltra.Text>Right</Voltra.Text>
</Voltra.View>
```

## Supported Properties

Voltra supports the following flexbox style properties. For detailed explanations and examples of each property, see the [React Native Flexbox documentation](https://reactnative.dev/docs/flexbox).

### Container Properties

| Property | Supported Values |
|---|---|
| `flexDirection` | `'column'` (default), `'row'` |
| `justifyContent` | `'flex-start'` (default), `'center'`, `'flex-end'`, `'space-between'`, `'space-around'`, `'space-evenly'` |
| `alignItems` | `'stretch'` (default), `'flex-start'`, `'center'`, `'flex-end'` |
| `gap` | Number (points) — applies along main axis only |

### Child Properties

| Property | Description |
|---|---|
| `flex` | Shorthand for `flexGrow` and `flexShrink` |
| `flexGrow` | How much the item should grow (default: `0`) |
| `flexShrink` | How much the item should shrink (default: `0`) |
| `flexBasis` | Initial size before flex grow/shrink |
| `alignSelf` | Override parent's `alignItems` for this child |
| `width`, `height` | Fixed dimensions |
| `minWidth`, `maxWidth` | Width constraints |
| `minHeight`, `maxHeight` | Height constraints |
| `margin` | Outer spacing |
| `padding` | Inner spacing |

### Unsupported Properties

The following React Native flexbox properties are **not supported** in Voltra:

- `flexWrap` — items are always laid out in a single line
- `rowGap`, `columnGap` — only the unified `gap` property is supported, applied along the main axis
- Percentage-based `width` or `height` (e.g. `width: '50%'`) — use `flexGrow` instead

## Differences from React Native

If you're coming from React Native, keep these differences in mind:

### Flexbox is opt-in

In React Native, every `View` uses flexbox by default. In Voltra, only `Voltra.View` uses flexbox. Other containers (`VStack`, `HStack`) use native SwiftUI layout.

### Gap is single-axis only

React Native supports `gap`, `rowGap`, and `columnGap`. Voltra only supports `gap`, which applies spacing between children along the main axis (the direction of `flexDirection`).

### No flex wrap

React Native supports `flexWrap: 'wrap'` to flow items onto multiple lines. Voltra does not — all items stay on a single line and will overflow or shrink.

### No percentage dimensions

React Native allows `width: '50%'` and similar percentage values. In Voltra, use `flexGrow` for proportional sizing instead.

## Next Steps

- [React Native Flexbox documentation](https://reactnative.dev/docs/flexbox) — comprehensive guide to flexbox properties and concepts
- [View component documentation](../components/layout#view) — API reference for `Voltra.View`
- [Styling in Voltra](./styling) — more about style properties
