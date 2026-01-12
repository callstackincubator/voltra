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

A gauge indicator for progress visualization, often used for battery, volume, or other value indicators (iOS 16+).

**Parameters:**

- `value` (number, optional): Current gauge value
- `minimumValue` (number, optional): Minimum value of the gauge range (default: `0`)
- `maximumValue` (number, optional): Maximum value of the gauge range (default: `1`)
- `endAtMs` (number, optional): End time in milliseconds since epoch (for timer-based gauges)
- `startAtMs` (number, optional): Start time in milliseconds since epoch (for timer-based gauges)
- `tintColor` (string, optional): Tint color for the gauge
- `gaugeStyle` (string, optional): Visual style - `"automatic"`, `"accessoryLinear"`, `"accessoryLinearCapacity"`, `"accessoryCircular"`, `"accessoryCircularCapacity"`, or `"linearCapacity"`
- `currentValueLabel` (ReactNode, optional): Custom component for current value label
- `minimumValueLabel` (ReactNode, optional): Custom component for minimum value label
- `maximumValueLabel` (ReactNode, optional): Custom component for maximum value label

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
