# Native modifiers

Native modifiers apply SwiftUI modifiers that `style` does not cover, such as `widgetURL`, `containerBackground`, `privacySensitive` and `contentTransition`, to any Voltra component.

:::warning Use them in Dynamic Widgets and Dynamic Live Activities
Native modifiers are meant for [Dynamic Widgets](./dynamic-widgets.md) and [Dynamic Live Activities](./dynamic-live-activities.md). Payload widgets and pushed Live Activities accept them too, but every modifier is sent with every update and counts against the payload size limit. A pushed Live Activity update can go over the 4 KB ActivityKit limit, and Voltra then throws when it renders the update.
:::

## Add a modifier

Pass a list of modifiers from `Voltra.modifiers` to the `modifiers` prop:

```tsx
import { Voltra } from '@use-voltra/ios'

const { containerBackground, widgetURL, privacySensitive, contentTransition } = Voltra.modifiers

export default function PortfolioWidget({ balance }: { balance: string }) {
  return (
    <Voltra.VStack
      style={{ padding: 16 }}
      modifiers={[containerBackground('#101828'), widgetURL('myapp://portfolio')]}
    >
      <Voltra.Text style={{ color: '#FFFFFF', fontSize: 28 }} modifiers={[privacySensitive(), contentTransition('numericText')]}>
        {balance}
      </Voltra.Text>
    </Voltra.VStack>
  )
}
```

`Voltra` components only accept modifiers from `Voltra.modifiers`. Passing a modifier from `VoltraAndroid.modifiers`, or a plain object, is a TypeScript error.

## Order and style

Modifiers wrap the finished component, including everything `style` does, in list order. The first modifier is innermost:

- `clipShape`, `blur` and the color adjustments apply to the whole component, background included.
- A native modifier wins over a `style` property that sets the same thing, because it is applied last.
- To apply a modifier between two style steps, such as clipping before a shadow, nest a `Voltra.View` with the inner style and put the modifier on it.

Text modifiers such as `minimumScaleFactor`, `truncationMode` and `monospacedDigit` work on any component. On a container they apply to every `Text` inside it.

## Available modifiers

Modifiers that need a newer iOS version than the device runs leave the component unchanged.

### Widgets and Live Activities

| Modifier | What it does | iOS |
| --- | --- | --- |
| `widgetURL(url)` | Opens the URL in your app when the widget is tapped. | 14.0 |
| `containerBackground(color)` | Sets the widget's removable container background. Use it on the outermost component. | 17.0 |
| `widgetAccentable(accentable?)` | Adds the component to the accent group in accented rendering mode. | 16.0 |
| `privacySensitive(sensitive?)` | Redacts the component while the device is locked. | 15.0 |
| `redacted(reason)` | Renders the component redacted: `placeholder`, `privacy`, or `invalidated` (iOS 17). | 14.0 |
| `unredacted()` | Keeps the component visible inside a redacted container. | 14.0 |
| `invalidatableContent(invalidatable?)` | Marks content that goes stale while an interactive widget updates. | 17.0 |
| `activityBackgroundTint(color \| null)` | Tints the Live Activity's Lock Screen background. | 16.1 |
| `activitySystemActionForegroundColor(color \| null)` | Colors the system action button next to the Live Activity. | 16.1 |

### Transitions and animation

| Modifier | What it does | iOS |
| --- | --- | --- |
| `contentTransition(kind, { countsDown? })` | Animates content changes: `identity`, `opacity`, `interpolate`, `numericText`, or `symbolEffect` (iOS 17). | 16.0 |
| `transition(kind, { edge? })` | Animates the component in and out between updates: `identity`, `opacity`, `scale`, `slide`, `push`, `move`. | 16.0 |
| `animation(curve, { value, duration? })` | Animates the component when `value` changes. `bouncy`, `smooth` and `snappy` need iOS 17. | 13.0 |
| `symbolEffect(effect)` | Plays an indefinite effect on `Symbol` components: `pulse`, `variableColor`, or `breathe`, `rotate`, `wiggle` (iOS 18). | 17.0 |

### Visual effects

| Modifier | What it does | iOS |
| --- | --- | --- |
| `clipShape(shape, { cornerRadius?, cornerStyle? })` | Clips to `rectangle`, `roundedRectangle`, `circle`, `capsule`, or `ellipse`. | 13.0 |
| `blur(radius, { opaque? })` | Applies a Gaussian blur. | 13.0 |
| `grayscale(amount)`, `saturation(amount)`, `brightness(amount)`, `contrast(amount)` | Adjusts colors. | 13.0 |
| `blendMode(mode)` | Sets how the component blends with what is behind it. | 13.0 |

### Geometry and layout

| Modifier | What it does | iOS |
| --- | --- | --- |
| `rotationEffect(degrees)` | Rotates the rendered component without changing layout. | 13.0 |
| `scaleEffect(scale \| { x?, y? })` | Scales the rendered component without changing layout. | 13.0 |
| `offset({ x?, y? })` | Moves the rendered component without changing layout. | 13.0 |
| `fixedSize({ horizontal?, vertical? })` | Keeps the ideal size instead of shrinking to fit. | 13.0 |
| `layoutPriority(priority)` | Gives the component a larger share of space in its stack. | 13.0 |
| `containerRelativeFrame(axes)` | Sizes the component relative to its container: `horizontal`, `vertical`, or `both`. | 17.0 |
| `dynamicTypeSize(size)` | Uses a fixed Dynamic Type size for text inside. | 15.0 |

### Text

| Modifier | What it does | iOS |
| --- | --- | --- |
| `minimumScaleFactor(factor)` | Lets text shrink to this fraction of its size to fit. | 13.0 |
| `truncationMode(mode)` | Truncates at the `head`, `middle`, or `tail`. | 13.0 |
| `multilineTextAlignment(alignment)` | Aligns lines of multi-line text: `leading`, `center`, `trailing`. | 13.0 |
| `monospacedDigit()` | Uses fixed-width digits so changing numbers do not shift. | 16.0 |

## Troubleshooting

**A modifier has no effect.** Check the iOS version in the table. On older systems the component renders without the modifier. An invalid value, such as an unknown color string, is also skipped; the widget extension logs `Ignoring modifier <name>` under the `com.voltra` subsystem in Console.

**Tapping the widget opens the wrong URL.** A `deepLinkUrl` configured for the widget takes precedence over `widgetURL`. Remove one of them, and use `widgetURL` only once per widget.

**Values change without animating.** SwiftUI animates between updates only when each position in the list keeps the same modifier. Changing the modifier at a position, or adding and removing the whole list, redraws the component instead.

**A pushed update fails with a payload size error.** Move the UI that needs modifiers to a Dynamic Live Activity or Dynamic Widget, or remove modifiers from the pushed tree.
