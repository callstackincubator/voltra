# Data Visualization & Status (iOS)

Components specifically designed to show dynamic values or states over time in Live Activities and Widgets.

### LinearProgressView

A horizontal progress bar that displays determinate progress or timer-based progress.

---

### CircularProgressView

A circular progress indicator that displays determinate progress or timer-based progress.

---

### Gauge

A gauge indicator for progress visualization (iOS 16+).

---

### Timer

A flexible component for displaying live-updating time intervals. Crucial for Live Activities, it uses native SwiftUI text interpolation to ensure the time updates automatically on the lock screen and in the Dynamic Island without requiring background updates from React Native.

**Modes:**

- **Timer Mode:** For fixed intervals (countdowns or counting up to a target). Requires `endAtMs` or `durationMs`.
- **Stopwatch Mode:** For open-ended intervals counting up from a starting point. Requires `startAtMs` and `direction="up"`, but both `endAtMs` and `durationMs` must be omitted.

**Parameters:**

- `startAtMs` (number, optional): Start time in milliseconds since epoch.
- `endAtMs` (number, optional): End time in milliseconds since epoch.
- `durationMs` (number, optional): Duration in milliseconds. Used if `endAtMs` is omitted.
- `direction` (string, optional): Count direction. Can be `'up'` or `'down'`. Defaults to `'down'`.
- `textStyle` (string, optional): Formatting style.
  - `'timer'`: Standard clock format (e.g., `05:00`).
  - `'relative'`: Relative format (e.g., `5m`).
- `showHours` (boolean, optional): Whether to show hours (e.g., `1:30:00` vs `90:00`). Defaults to `false`.
- `textTemplates` (string, optional): JSON-encoded object with `running` and `completed` templates. Use `{time}` as a placeholder.

**Examples:**

```tsx
// Timer Mode: Countdown 5 minutes
<Voltra.Timer
  durationMs={5 * 60 * 1000}
  direction="down"
/>

// Stopwatch Mode: Count up indefinitely from now
<Voltra.Timer
  startAtMs={Date.now()}
  direction="up"
/>

// Relative Timer with Template
<Voltra.Timer
  endAtMs={Date.now() + 10000}
  textStyle="relative"
  textTemplates={JSON.stringify({
    running: "Ends in {time}",
    completed: "Time's up!"
  })}
/>
```
