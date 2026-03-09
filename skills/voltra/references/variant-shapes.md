# Variant Shapes

Use these iOS Live Activity shapes.

## Minimal lock screen only

```tsx
const variants = {
  lockScreen: <Voltra.Text>Hello</Voltra.Text>,
}
```

## Dynamic Island shape

```tsx
const variants = {
  island: {
    minimal: <Voltra.Text>M</Voltra.Text>,
    compact: {
      leading: <Voltra.Text>L</Voltra.Text>,
      trailing: <Voltra.Text>T</Voltra.Text>,
    },
    expanded: {
      leading: <Voltra.Text>L</Voltra.Text>,
      trailing: <Voltra.Text>T</Voltra.Text>,
      center: <Voltra.Text>C</Voltra.Text>,
      bottom: <Voltra.Text>B</Voltra.Text>,
    },
  },
}
```

## Supplemental families

```tsx
const variants = {
  supplementalActivityFamilies: {
    small: <Voltra.Text>ETA 12 min</Voltra.Text>,
  },
}
```

Hosted docs: see `source-of-truth.md`.
