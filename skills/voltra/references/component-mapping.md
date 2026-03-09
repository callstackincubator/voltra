# Component Mapping

Prefer these Android Voltra primitives over iOS or React Native UI primitives:

- `VoltraAndroid.Column` instead of `Voltra.VStack`
- `VoltraAndroid.Row` instead of `Voltra.HStack`
- `VoltraAndroid.Box` instead of layered RN `View` trees
- `VoltraAndroid.Text` instead of RN `Text`
- `VoltraAndroid.Image` instead of RN `Image`
- `VoltraAndroid.Scaffold` for top-level Android widget layouts
- `VoltraAndroid.Spacer` for spacing
- Android-specific controls when needed:
  - `Button`
  - `FilledButton`
  - `OutlineButton`
  - `CircleIconButton`
  - `SquareIconButton`
  - `Switch`
  - `CheckBox`
  - `RadioButton`

Avoid these in Android Voltra UI:

- `Voltra.VStack`
- `Voltra.HStack`
- RN `View`
- RN `Text`
- RN `Pressable`
- Native Glance/Kotlin implementations

Hosted docs: see `source-of-truth.md`.
