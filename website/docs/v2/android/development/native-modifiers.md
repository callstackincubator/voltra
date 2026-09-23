# Native modifiers

Native modifiers apply Jetpack Glance modifiers that `style` does not cover, such as `semantics`, `appWidgetBackground` and day/night backgrounds, to any Voltra Android component.

:::warning Use them in Dynamic Widgets
Native modifiers are meant for [Dynamic Widgets](./dynamic-widgets.md). Payload widgets accept them too, but every modifier is stored and sent with every update, which makes the payload larger.
:::

## Add a modifier

Pass a list of modifiers from `VoltraAndroid.modifiers` to the `modifiers` prop:

```tsx
import { AndroidDynamicColors, VoltraAndroid } from '@use-voltra/android'

const { appWidgetBackground, background, semantics, visibility } = VoltraAndroid.modifiers

export default function PortfolioWidget({ balance, stale }: { balance: string; stale: boolean }) {
  return (
    <VoltraAndroid.Column
      style={{ width: '100%', height: '100%', padding: 12 }}
      modifiers={[
        appWidgetBackground(),
        background(AndroidDynamicColors.surface),
        semantics({ contentDescription: `Portfolio balance ${balance}` }),
      ]}
    >
      <VoltraAndroid.Text style={{ fontSize: 24 }}>{balance}</VoltraAndroid.Text>
      <VoltraAndroid.Text modifiers={[visibility(stale ? 'visible' : 'gone')]}>Updating…</VoltraAndroid.Text>
    </VoltraAndroid.Column>
  )
}
```

`VoltraAndroid` components only accept modifiers from `VoltraAndroid.modifiers`. Passing a modifier from `Voltra.modifiers`, or a plain object, is a TypeScript error.

## Order and style

Glance applies modifiers after `style`, and it does not care about their order:

- Where a modifier and a `style` property set the same thing, such as a width or a background, the modifier wins. The exception is `style.flex` on a child of a `Row` or `Column`: it replaces the child's `width`, `height`, `size`, `fillMax…` and `wrapContent…` modifiers along the row or column.
- Padding adds up. `style={{ padding: 8 }}` with `modifiers={[padding(8)]}` gives 16 dp.
- Using the same modifier twice keeps the last one, except for `padding` and `absolutePadding`, which add up.

## Available modifiers

| Modifier | What it does | Android |
| --- | --- | --- |
| `padding(dp \| { all?, horizontal?, vertical?, start?, top?, end?, bottom? })` | Adds padding that follows the layout direction. | 7.0 |
| `absolutePadding(dp \| { all?, horizontal?, vertical?, left?, top?, right?, bottom? })` | Adds padding that ignores the layout direction. | 7.0 |
| `width(dp)`, `height(dp)`, `size(dp \| { width, height })` | Sets a fixed size. | 7.0 |
| `fillMaxWidth()`, `fillMaxHeight()`, `fillMaxSize()` | Fills the available space. | 7.0 |
| `wrapContentWidth()`, `wrapContentHeight()`, `wrapContentSize()` | Sizes to the content. | 7.0 |
| `background(color \| { day, night })` | Fills the background with a color, an `AndroidDynamicColors` token, or separate light and dark colors. | 7.0 |
| `cornerRadius(dp)` | Rounds the corners. | 12 |
| `visibility('visible' \| 'invisible' \| 'gone')` | Shows the component, hides it but keeps its space, or removes it from layout. | 7.0 |
| `semantics({ contentDescription?, testTag? })` | Sets the text read by accessibility services and a tag for UI tests. | 7.0 |
| `appWidgetBackground()` | Marks the widget background so the launcher can animate it when the widget opens your app. Use it once, on the outermost component; if several components set it, only the first one keeps it. | 12 |

For light and dark colors, `background({ day, night })` takes two color strings. To follow the device's Material You theme instead, pass an `AndroidDynamicColors` token. See [Dynamic Colors](./dynamic-colors.md).

Native modifiers do not handle taps. To open your app from a component, use its `deepLinkUrl` prop.

## Troubleshooting

**Corners are not rounded.** `cornerRadius` only works on Android 12 (API 31) and later. Older versions render square corners.

**A modifier has no effect.** An unknown modifier or an invalid value, such as a color string that does not parse or `day` and `night` given as `AndroidDynamicColors` tokens, is skipped. Run `adb logcat -s VoltraModifiers` to see which one and why.

**The padding is larger than expected.** Glance adds `padding` modifiers to `style.padding`. Remove one of them.
