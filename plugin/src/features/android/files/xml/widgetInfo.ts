import dedent from 'dedent'

import type { AndroidWidgetConfig } from '../../../../types'

/**
 * Generates widget provider info XML for a single widget
 */
export function generateWidgetInfoXml(
  widget: AndroidWidgetConfig,
  previewImageResourceName?: string,
  previewLayoutResourceName?: string
): string {
  const { targetCellWidth, targetCellHeight } = widget
  const resizeMode = widget.resizeMode || 'horizontal|vertical'
  const widgetCategory = widget.widgetCategory || 'home_screen'

  let minWidth = widget.minWidth
  if (minWidth === undefined && widget.minCellWidth !== undefined) {
    minWidth = widget.minCellWidth * 70 - 30
  }

  let minHeight = widget.minHeight
  if (minHeight === undefined && widget.minCellHeight !== undefined) {
    minHeight = widget.minCellHeight * 70 - 30
  }

  const minWidthAttr = minWidth !== undefined ? `\n    android:minWidth="${minWidth}dp"` : ''
  const minHeightAttr = minHeight !== undefined ? `\n    android:minHeight="${minHeight}dp"` : ''
  const previewImageAttr = previewImageResourceName
    ? `\n    android:previewImage="@drawable/${previewImageResourceName}"`
    : ''
  const previewLayoutAttr = previewLayoutResourceName
    ? `\n    android:previewLayout="@layout/${previewLayoutResourceName}"`
    : ''

  return dedent`
    <?xml version="1.0" encoding="utf-8"?>
    <appwidget-provider xmlns:android="http://schemas.android.com/apk/res/android"${minWidthAttr}${minHeightAttr}
        android:targetCellWidth="${targetCellWidth}"
        android:targetCellHeight="${targetCellHeight}"
        android:updatePeriodMillis="0"
        android:initialLayout="@layout/voltra_widget_placeholder"
        android:resizeMode="${resizeMode}"
        android:widgetCategory="${widgetCategory}"
        android:description="@string/voltra_widget_${widget.id}_description"${previewImageAttr}${previewLayoutAttr}>
    </appwidget-provider>
  `
}
