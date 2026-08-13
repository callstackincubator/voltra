# Gradients

The `backgroundColor` style property accepts CSS gradient strings in addition to solid colors. Gradients are rendered natively using SwiftUI gradient modifiers and are automatically clipped by `borderRadius`.

Invalid or unsupported gradient syntax is parsed in **strict mode** and results in **no gradient background** (instead of silent best-effort fallback).

## Linear gradients

```tsx
// Named direction
<Voltra.View style={{ backgroundColor: 'linear-gradient(to right, #6366F1, #EC4899)' }} />

// Diagonal
<Voltra.View style={{ backgroundColor: 'linear-gradient(to bottom right, #0EA5E9, #8B5CF6)' }} />

// Angle in degrees/radians/turns
<Voltra.View style={{ backgroundColor: 'linear-gradient(45deg, #FF6B6B, #FFD93D)' }} />
<Voltra.View style={{ backgroundColor: 'linear-gradient(0.25turn, #FF6B6B, #FFD93D)' }} />
```

Supported directions: `to right`, `to left`, `to top`, `to bottom`, `to top right`, `to top left`, `to bottom right`, `to bottom left`.

## Color stops

Explicit percentage positions are supported:

```tsx
<Voltra.View
  style={{
    backgroundColor: 'linear-gradient(to right, red 0%, yellow 50%, blue 100%)',
  }}
/>
```

When positions are omitted, Voltra applies CSS-like stop fix-up:
- First and last unspecified stops default to `0%` and `100%`.
- Unspecified stops between explicit anchors are linearly interpolated.
- Non-monotonic explicit positions are clamped forward.

## RGBA colors inside gradients

```tsx
<Voltra.View
  style={{
    backgroundColor: 'linear-gradient(to right, rgba(255,0,0,0.8), rgba(0,0,255,0.3))',
  }}
/>
```

## Radial gradients

```tsx
<Voltra.View style={{ backgroundColor: 'radial-gradient(#FF6B6B, #6366F1)' }} />
<Voltra.View style={{ backgroundColor: 'radial-gradient(circle at top right, #FF6B6B, #6366F1)' }} />
<Voltra.View style={{ backgroundColor: 'radial-gradient(closest-side at left bottom, #FF6B6B, #6366F1)' }} />
```

:::note
Radial gradients are rendered with geometry-aware radii computed from the view size (`closest-side`, `farthest-side`, `closest-corner`, `farthest-corner`).

For `ellipse`, SwiftUI does not provide native elliptical radial gradients. Voltra approximates ellipse behavior by scaling a circular radial gradient.
:::

## Conic gradients

```tsx
<Voltra.View style={{ backgroundColor: 'conic-gradient(from 45deg, red, blue)' }} />
<Voltra.View style={{ backgroundColor: 'conic-gradient(from 45deg at top right, red 0%, blue 75%)' }} />
```

## With border radius

Gradients are clipped by `borderRadius` automatically — no extra configuration needed:

```tsx
<Voltra.View
  style={{
    backgroundColor: 'linear-gradient(to right, #6366F1, #EC4899)',
    borderRadius: 16,
    padding: 16,
  }}
>
  <Voltra.Text style={{ color: '#FFFFFF' }}>Rounded gradient card</Voltra.Text>
</Voltra.View>
```

## Solid colors still work unchanged

Passing a plain color string to `backgroundColor` continues to work exactly as before:

```tsx
<Voltra.View style={{ backgroundColor: '#3B82F6' }} />
<Voltra.View style={{ backgroundColor: 'red' }} />
<Voltra.View style={{ backgroundColor: 'rgba(0,0,0,0.5)' }} />
```

## Comparison with `<LinearGradient>` component

| Feature | `backgroundColor` gradient | `<LinearGradient>` component |
|---|---|---|
| CSS string syntax | ✓ | — |
| Named directions (`to right`) | ✓ (physical direction) | ✓ |
| Angle units | `deg`, `rad`, `turn` | ✓ via `{x,y}` |
| `{x, y}` coordinate control | — | ✓ |
| Stop positions | `linear/radial`: `%`, `conic`: `%` + angle units | ✓ via `locations` prop |
| Multi-position stops (`red 20% 40%`) | ✓ | — |
| `radial-gradient` | ✓ (`circle` / approximated `ellipse`) | — |
| `conic-gradient` | ✓ (`from` + `at`) | — |
| Strict invalid syntax handling | ✓ (fails closed) | — |
| Dithering | — | ✓ |
| Children layered on top | ✓ (as background) | ✓ (as container) |

Use `backgroundColor` gradient strings for convenience and web-style syntax. Use `<LinearGradient>` when you need precise `{x, y}` coordinate control or dithering.

## Scope and exclusions

- Supported core syntax: `linear-gradient(...)`, `radial-gradient(...)`, `conic-gradient(...)`.
- Not supported in this parser: `repeating-linear-gradient(...)`, `repeating-radial-gradient(...)`, `repeating-conic-gradient(...)`.
