# Data Visualization & Status

Components specifically designed to show dynamic values or states over time.

### ProgressView

A progress indicator that can display either determinate progress (linear or circular) or timer-based progress.

**Parameters:**

- `defaultValue` (number, optional): Current progress value
- `maximumValue` (number, optional): Maximum progress value (default: `100`)
- `timerEndDateInMilliseconds` (number, optional): Legacy: End time for timer-based progress
- `endAtMs` (number, optional): End time in milliseconds since epoch
- `startAtMs` (number, optional): Start time in milliseconds since epoch
- `mode` (string, optional): Progress view style - `"bar"` or `"circular"` (default: `"bar"`)

**Apple Documentation:** [ProgressView](https://developer.apple.com/documentation/swiftui/progressview)

---

### Gauge

A gauge indicator for progress visualization, often used for battery, volume, or other circular value indicators (iOS 16+).

**Parameters:**

- `defaultValue` (number, optional): Current gauge value (0-1 range)
- `endAtMs` (number, optional): End time in milliseconds since epoch
- `startAtMs` (number, optional): Start time in milliseconds since epoch
- `showValueLabel` (boolean, optional): Show the value label
- `hideValueLabel` (boolean, optional): Hide the value label

**Apple Documentation:** [Gauge](https://developer.apple.com/documentation/swiftui/gauge)

---

### Timer

A flexible countdown or stopwatch component that counts down or up to a specific date. This is crucial for Live Activities.

**Parameters:**

- `endAtMs` (number, optional): End time in milliseconds since epoch
- `startAtMs` (number, optional): Start time in milliseconds since epoch
- `durationMs` (number, optional): Duration in milliseconds
- `mode` (string, optional): Display mode - `"text"`, `"bar"`, or `"circular"` (default: `"text"`)
- `direction` (string, optional): Count direction - `"up"` or `"down"` (default: `"down"`)
- `autoHideOnEnd` (boolean, optional): Hide timer when complete
- `textStyle` (string, optional): Text formatting style - `"timer"` or `"relative"` (default: `"timer"`)
- `textTemplates` (string, optional): JSON-encoded TextTemplates object with running/completed templates
- `modeOrderedModifiers` (string, optional): JSON-encoded mode-specific modifiers map
- `modeTrackColors` (string, optional): JSON-encoded track colors map
- `modeTintColors` (string, optional): JSON-encoded tint colors map

**Apple Documentation:** [Text](https://developer.apple.com/documentation/swiftui/text) (Timer formatting)
