# Native modifiers

Native modifiers apply SwiftUI modifiers that `style` does not cover, such as `widgetURL`, `containerBackground`, `privacySensitive` and `contentTransition`, to any Voltra component.

:::warning Use them in Dynamic Widgets and Dynamic Live Activities
Native modifiers are meant for [Dynamic Widgets](./dynamic-widgets) and [Dynamic Live Activities](./dynamic-live-activities). [Payload widgets](./server-driven-widgets) and [pushed Live Activities](./server-side-updates) accept them too, but every modifier is sent with every update and counts against the payload size limit. Voltra keeps Live Activity payloads under about 3.3 KB so they fit ActivityKit's 4 KB limit, and throws a payload size error when you render an update that is larger.
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
- Geometry modifiers such as `rotationEffect`, `scaleEffect` and `offset` add to a `style.transform`, they do not replace it.
- Text modifiers set a value for the text inside, and SwiftUI uses the setting closest to the text. A value the component sets itself wins over the modifier, such as `style.textAlign` or the `multilineTextAlignment` prop over a `multilineTextAlignment` modifier.
- To apply a modifier before part of the style, such as clipping before a shadow is drawn, nest a `Voltra.View`: put the modifier on the inner one and the shadow on the outer one.

Text modifiers such as `minimumScaleFactor`, `truncationMode` and `monospacedDigit` work on any component. On a container they apply to every `Text` inside it that does not set the same thing itself.

## Available modifiers

Modifiers marked iOS 17+ leave the component unchanged on older systems. The same applies to options marked iOS 17 or iOS 18.

### Widgets and Live Activities

| Modifier | What it does |
| --- | --- |
| `widgetURL(url)` | Opens the URL in your app when the widget or Live Activity is tapped. Takes an absolute URL or a path, like `deepLinkUrl`. The compact and minimal Dynamic Island ignore it. |
| `containerBackground(color)` | Sets the widget's removable container background. Use it on the outermost component. iOS 17+. |
| `widgetAccentable(accentable?)` | Adds the component to the accent group in accented rendering mode. |
| `privacySensitive(sensitive?)` | Redacts the component while the device is locked. |
| `redacted(reason)` | Renders the component redacted: `placeholder`, `privacy`, or `invalidated` (iOS 17). |
| `unredacted()` | Keeps the component visible inside a redacted container. |
| `invalidatableContent(invalidatable?)` | Marks content that goes stale while an interactive widget updates. iOS 17+. |
| `activityBackgroundTint(color \| null)` | Tints the Live Activity's Lock Screen background. A tint passed when starting or updating the Live Activity takes precedence. |
| `activitySystemActionForegroundColor(color \| null)` | Colors the system action button next to the Live Activity. |

### Transitions and animation

| Modifier | What it does |
| --- | --- |
| `contentTransition(kind, { countsDown? })` | Animates content changes: `identity`, `opacity`, `interpolate`, `numericText`, or `symbolEffect` (iOS 17). |
| `transition(kind, { edge? })` | Animates a component that appears or disappears between two updates: `identity`, `opacity`, `scale`, `slide`, `push`, `move`. Put `animation` on a parent that stays, and give the siblings an `id`. |
| `animation(curve, { value, duration? })` | Animates the component when `value` changes. `duration` does not apply to `default` and `spring`. `bouncy`, `smooth` and `snappy` need iOS 17. |
| `symbolEffect(effect)` | Applies an indefinite effect to `Symbol` components: `pulse`, `variableColor`, or `breathe`, `rotate`, `wiggle` (iOS 18). Widgets and Live Activities may show it as a still frame. iOS 17+. |

### Visual effects

| Modifier | What it does |
| --- | --- |
| `clipShape(shape, { cornerRadius?, cornerStyle? })` | Clips to `rectangle`, `roundedRectangle`, `circle`, `capsule`, or `ellipse`. `cornerRadius` only applies to `roundedRectangle`. |
| `blur(radius, { opaque? })` | Applies a Gaussian blur. |
| `grayscale(amount)`, `saturation(amount)`, `brightness(amount)`, `contrast(amount)` | Adjusts colors. |
| `blendMode(mode)` | Sets how the component blends with what is behind it. |

### Geometry and layout

| Modifier | What it does |
| --- | --- |
| `rotationEffect(degrees)` | Rotates the rendered component without changing layout. |
| `scaleEffect(scale \| { x?, y? })` | Scales the rendered component without changing layout. |
| `offset({ x?, y? })` | Moves the rendered component without changing layout. |
| `fixedSize({ horizontal?, vertical? })` | Keeps the ideal size instead of shrinking to fit. |
| `layoutPriority(priority)` | Gives the component a larger share of space in its stack. |
| `containerRelativeFrame(axes)` | Sizes the component relative to its container: `horizontal`, `vertical`, or `both`. iOS 17+. |
| `dynamicTypeSize(size)` | Uses a fixed Dynamic Type size for content inside. Voltra `Text` uses fixed font sizes, so it does not change. |

### Text

| Modifier | What it does |
| --- | --- |
| `minimumScaleFactor(factor)` | Lets text shrink to this fraction of its size to fit. |
| `truncationMode(mode)` | Truncates at the `head`, `middle`, or `tail`. |
| `multilineTextAlignment(alignment)` | Aligns lines of multi-line text: `leading`, `center`, `trailing`. |
| `monospacedDigit()` | Uses fixed-width digits so changing numbers do not shift. |

## Troubleshooting

**A modifier has no effect.** Check whether the table marks it iOS 17+. On older systems the component renders without the modifier. An invalid value, such as an unknown color string, is also skipped; the widget extension logs `Ignoring modifier <name>` under the `com.voltra` subsystem in Console.

**Tapping the widget opens the wrong URL.** A `deepLinkUrl` configured for the widget or Live Activity takes precedence over `widgetURL`. Remove one of them, and use `widgetURL` only once per widget. In a Live Activity, use it once per presentation.

**Tapping the Dynamic Island opens the app but not the URL.** A tap on the compact or minimal Dynamic Island opens only the Live Activity's `deepLinkUrl`. A `widgetURL` inside those regions is not used, and Voltra logs a warning under the `com.voltra` subsystem in Console. Pass `deepLinkUrl` when you start the Live Activity.

**The widget background does not change.** Put `containerBackground` on the widget's outermost component, and use it only once. It needs iOS 17; on iOS 16 use `style.backgroundColor` instead.

**Values change without animating.** SwiftUI animates between updates only when each position in the list keeps the same modifier. Changing the modifier at a position, or adding and removing the whole list, redraws the component instead.

**A component appears or disappears without animating.** SwiftUI animates an insertion or removal in the parent, so `animation` on the component itself has nothing to animate. Put `animation({ value })` on a parent that is present before and after, keep `transition` on the component, and give the parent's children an `id`; without one, children are matched by position, and a sibling can take the place of the component that disappeared.

**Rendering a pushed update fails with `Compressed payload size … exceeds safe budget`.** Move the UI that needs modifiers to a Dynamic Live Activity or Dynamic Widget, or remove modifiers from the pushed tree.
