# Data Visualization & Status (Android)

Components for displaying data and status information on Android widgets.

### LinearProgressIndicator

A horizontal progress bar.

**Parameters:**

- `progress` (number, optional): Current progress value (0.0 to 1.0). If omitted, the indicator will be indeterminate.
- `color` (string, optional): Color for the progress indicator.
- `backgroundColor` (string, optional): Color for the background track.

---

### CircularProgressIndicator

A circular progress indicator.

**Parameters:**

- `color` (string, optional): Color for the progress indicator.

:::warning Indeterminate Only
Due to Jetpack Compose Glance limitations, the `CircularProgressIndicator` on Android only supports **indeterminate** mode. The `progress` property is ignored.
:::
