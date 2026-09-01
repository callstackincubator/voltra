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
}

function cellsToWidthDp(cells: number): number {
  return cells * 73 - 16
}

function cellsToHeightDp(cells: number): number {
  return cells * 66 - 15
}

/**
 * Sizing attributes for a single widget, ordered as in Android's own reference example.
 *
 * `minWidth` and `minHeight` are always emitted, so a widget is placed at its intended size on
 * Android 11 and older: an explicit dp value wins, then the deprecated cell count, then the
 * target cell count.
 */
export function androidWidgetSizingAttributes(widget: AndroidWidgetSizingInput): string[] {
  const minWidth = widget.minWidth ?? cellsToWidthDp(widget.minCellWidth ?? widget.targetCellWidth)
  const minHeight = widget.minHeight ?? cellsToHeightDp(widget.minCellHeight ?? widget.targetCellHeight)

  return [
    `android:minWidth="${minWidth}dp"`,
    `android:minHeight="${minHeight}dp"`,
    `android:targetCellWidth="${widget.targetCellWidth}"`,
    `android:targetCellHeight="${widget.targetCellHeight}"`,
  ]
}
