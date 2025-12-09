# Data Visualization & Status

Components specifically designed to show dynamic values or states over time.

### LinearProgressView

A horizontal progress bar that displays determinate progress or timer-based progress.

**Parameters:**

- `value` (number, optional): Current progress value
- `maximumValue` (number, optional): Maximum progress value (default: `100`)
- `countDown` (boolean, optional): Whether to count down instead of up
- `endAtMs` (number, optional): End time in milliseconds since epoch
- `startAtMs` (number, optional): Start time in milliseconds since epoch
- `trackColor` (string, optional): Color for the track (background) of the progress bar
- `progressColor` (string, optional): Color for the progress fill
- `cornerRadius` (number, optional): Corner radius for the progress bar
- `height` (number, optional): Explicit height for the progress bar
- `thumb` (ReactNode, optional): Custom thumb component to display at progress position

**Apple Documentation:** [ProgressView](https://developer.apple.com/documentation/swiftui/progressview)

---

### CircularProgressView

A circular progress indicator that displays determinate progress or timer-based progress.

**Parameters:**

- `value` (number, optional): Current progress value
- `maximumValue` (number, optional): Maximum progress value (default: `100`)
- `countDown` (boolean, optional): Whether to count down instead of up
- `endAtMs` (number, optional): End time in milliseconds since epoch
- `startAtMs` (number, optional): Start time in milliseconds since epoch
- `trackColor` (string, optional): Color for the track (background) of the circular progress indicator
- `progressColor` (string, optional): Color for the progress fill
- `lineWidth` (number, optional): Width of the stroke line

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
- `direction` (string, optional): Count direction - `"up"` or `"down"` (default: `"down"`)
- `autoHideOnEnd` (boolean, optional): Hide timer when complete
- `textStyle` (string, optional): Text formatting style - `"timer"` or `"relative"` (default: `"timer"`)
- `textTemplates` (string, optional): JSON-encoded TextTemplates object with running/completed templates

**Apple Documentation:** [Text](https://developer.apple.com/documentation/swiftui/text) (Timer formatting)
