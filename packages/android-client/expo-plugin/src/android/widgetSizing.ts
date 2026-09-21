/**
 * Android widget sizing.
 *
 * Android 12+ (API 31+) places widgets by `targetCellWidth`/`targetCellHeight`, expressed in
 * launcher grid cells. Android 11 and older ignore those attributes entirely and place widgets by
 * `minWidth`/`minHeight`, expressed in dp, so a widget has to declare both sets to be placed
 * correctly everywhere. Voltra widgets build against the host app's `minSdkVersion` — React
 * Native's template sets 24 — so the pre-Android-12 path is not a legacy edge case.
 * https://developer.android.com/develop/ui/compose/glance/create-app-widget
 *
 * Cell size varies by device, launcher and orientation, so converting cells to dp can only ever be
 * an approximation. These are the figures Google publishes for a 5x4 handset grid, following the
 * accompanying guidance to size widths from the portrait table and heights from the landscape
 * table, because those are the smaller cells on each axis.
 * https://developer.android.com/develop/ui/views/appwidgets/layouts
 *
 * The `voltra` CLI and the `@use-voltra/android-client` Expo plugin generate the same
 * `appwidget-provider` XML from their own copy of this module; keep the two in sync.
 */

/** Widget fields that determine the generated `appwidget-provider` sizing attributes. */
export interface AndroidWidgetSizingInput {
  targetCellWidth: number
  targetCellHeight: number
  minWidth?: number
  minHeight?: number
  minCellWidth?: number
  minCellHeight?: number
  minResizeWidth?: number
  minResizeHeight?: number
  maxResizeWidth?: number
  maxResizeHeight?: number
}

/** Resize bounds, in dp, emitted only when set. `maxResize*` is honoured from Android 12 on. */
const RESIZE_BOUNDS = ['minResizeWidth', 'minResizeHeight', 'maxResizeWidth', 'maxResizeHeight'] as const

function cellsToWidthDp(cells: number): number {
  return cells * 73 - 16
}

function cellsToHeightDp(cells: number): number {
  return cells * 66 - 15
}

function resolveMinimumSize(widget: AndroidWidgetSizingInput): { minWidth: number; minHeight: number } {
  return {
    minWidth: widget.minWidth ?? cellsToWidthDp(widget.minCellWidth ?? widget.targetCellWidth),
    minHeight: widget.minHeight ?? cellsToHeightDp(widget.minCellHeight ?? widget.targetCellHeight),
  }
}

/**
 * Sizing attributes for a single widget, ordered as in Android's own reference example.
 *
 * `minWidth` and `minHeight` are always emitted, so a widget is placed at its intended size on
 * Android 11 and older: an explicit dp value wins, then the deprecated cell count, then the
 * target cell count.
 */
export function androidWidgetSizingAttributes(widget: AndroidWidgetSizingInput): string[] {
  const { minWidth, minHeight } = resolveMinimumSize(widget)

  const attributes = [
    `android:minWidth="${minWidth}dp"`,
    `android:minHeight="${minHeight}dp"`,
    `android:targetCellWidth="${widget.targetCellWidth}"`,
    `android:targetCellHeight="${widget.targetCellHeight}"`,
  ]

  for (const bound of RESIZE_BOUNDS) {
    const value = widget[bound]
    if (value !== undefined) {
      attributes.push(`android:${bound}="${value}dp"`)
    }
  }

  return attributes
}

/**
 * Resize bounds Android will silently ignore, described for the developer who set them.
 *
 * `minResizeWidth` has no effect when it is greater than `minWidth`, and `maxResizeWidth` has no
 * effect when it is smaller; likewise for the height pair. This reports rather than throws,
 * because `minWidth` is usually the approximation derived from the widget's cell count.
 * https://developer.android.com/reference/android/appwidget/AppWidgetProviderInfo
 */
export function androidWidgetSizingWarnings(widget: AndroidWidgetSizingInput, widgetId: string): string[] {
  const { minWidth, minHeight } = resolveMinimumSize(widget)
  const warnings: string[] = []

  const report = (bound: string, value: number, relation: string, minimum: string, minimumValue: number): void => {
    warnings.push(
      `Widget '${widgetId}': ${bound} (${value}dp) is ${relation} ${minimum} (${minimumValue}dp), so Android ignores it.`
    )
  }

  if (widget.minResizeWidth !== undefined && widget.minResizeWidth > minWidth) {
    report('minResizeWidth', widget.minResizeWidth, 'greater than', 'minWidth', minWidth)
  }
  if (widget.minResizeHeight !== undefined && widget.minResizeHeight > minHeight) {
    report('minResizeHeight', widget.minResizeHeight, 'greater than', 'minHeight', minHeight)
  }
  if (widget.maxResizeWidth !== undefined && widget.maxResizeWidth < minWidth) {
    report('maxResizeWidth', widget.maxResizeWidth, 'smaller than', 'minWidth', minWidth)
  }
  if (widget.maxResizeHeight !== undefined && widget.maxResizeHeight < minHeight) {
    report('maxResizeHeight', widget.maxResizeHeight, 'smaller than', 'minHeight', minHeight)
  }

  return warnings
}
