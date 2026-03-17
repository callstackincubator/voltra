import dedent from 'dedent'
import * as fs from 'fs'
import * as path from 'path'

import type { AndroidWidgetConfig } from '../../types'
import { logger } from '../../utils/logger'

export interface GenerateXmlFilesProps {
  platformProjectRoot: string
  projectRoot: string
  widgets: AndroidWidgetConfig[]
  previewImageMap: Map<string, string>
}

// ============================================================================
// Main Functions
// ============================================================================

/**
 * Generates widget info XML files for all widgets
 */
export async function generateWidgetInfoFiles(props: {
  platformProjectRoot: string
  widgets: AndroidWidgetConfig[]
}): Promise<void> {
  const { platformProjectRoot, widgets } = props
  const xmlPath = path.join(platformProjectRoot, 'app', 'src', 'main', 'res', 'xml')
  const valuesPath = path.join(platformProjectRoot, 'app', 'src', 'main', 'res', 'values')

  // Ensure directories exist
  if (!fs.existsSync(xmlPath)) {
    fs.mkdirSync(xmlPath, { recursive: true })
  }
  if (!fs.existsSync(valuesPath)) {
    fs.mkdirSync(valuesPath, { recursive: true })
  }

  // Generate string resources for all widgets
  const stringsPath = path.join(valuesPath, 'voltra_widgets.xml')
  const stringsContent = generateStringResourcesXml(widgets)
  fs.writeFileSync(stringsPath, stringsContent, 'utf8')
}

/**
 * Generates placeholder layout XML
 */
export async function generateWidgetPlaceholderLayouts(props: { platformProjectRoot: string }): Promise<void> {
  const layoutPath = path.join(props.platformProjectRoot, 'app', 'src', 'main', 'res', 'layout')

  if (!fs.existsSync(layoutPath)) {
    fs.mkdirSync(layoutPath, { recursive: true })
  }

  const placeholderLayoutPath = path.join(layoutPath, 'voltra_widget_placeholder.xml')
  const placeholderLayoutContent = generatePlaceholderLayoutXml()
  fs.writeFileSync(placeholderLayoutPath, placeholderLayoutContent, 'utf8')
}

/**
 * Generates preview layouts for widgets
 */
export async function generateWidgetPreviewLayouts(props: GenerateXmlFilesProps): Promise<void> {
  const { platformProjectRoot, projectRoot, widgets, previewImageMap } = props
  const layoutPath = path.join(platformProjectRoot, 'app', 'src', 'main', 'res', 'layout')
  const xmlPath = path.join(platformProjectRoot, 'app', 'src', 'main', 'res', 'xml')

  if (!fs.existsSync(layoutPath)) {
    fs.mkdirSync(layoutPath, { recursive: true })
  }

  // Generate preview layouts and get the map
  const previewLayoutMap = await generatePreviewLayouts(widgets, projectRoot, layoutPath, previewImageMap)

  // Write widget info XML for all widgets, including preview references where available
  for (const widget of widgets) {
    const widgetInfoPath = path.join(xmlPath, `voltra_widget_${widget.id}_info.xml`)
    const previewImageResourceName = previewImageMap.get(widget.id)
    const previewLayoutResourceName = previewLayoutMap.get(widget.id)
    const widgetInfoContent = generateWidgetInfoXml(widget, previewImageResourceName, previewLayoutResourceName)
    fs.writeFileSync(widgetInfoPath, widgetInfoContent, 'utf8')
  }
}

// ============================================================================
// Widget Info XML
// ============================================================================

/**
 * Generates widget provider info XML for a single widget
 */
function generateWidgetInfoXml(
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

// ============================================================================
// String Resources XML
// ============================================================================

/**
 * Generates string resources for widget display names and descriptions
 */
function generateStringResourcesXml(widgets: AndroidWidgetConfig[]): string {
  const stringEntries = widgets
    .map(
      (widget) =>
        `<string name="voltra_widget_${widget.id}_label">${widget.displayName}</string>\n    <string name="voltra_widget_${widget.id}_description">${widget.description}</string>`
    )
    .join('\n    ')

  return dedent`
    <?xml version="1.0" encoding="utf-8"?>
    <resources>
        <!-- Voltra Widget Labels and Descriptions (Auto-generated) -->
        ${stringEntries}
    </resources>
  `
}

// ============================================================================
// Placeholder Layout XML
// ============================================================================

/**
 * Generates placeholder layout XML for widgets
 * This will be replaced by Glance at runtime
 */
function generatePlaceholderLayoutXml(): string {
  return dedent`
    <?xml version="1.0" encoding="utf-8"?>
    <FrameLayout xmlns:android="http://schemas.android.com/apk/res/android"
        android:layout_width="match_parent"
        android:layout_height="match_parent"
        android:background="?android:attr/colorBackground">
        <TextView
            android:layout_width="wrap_content"
            android:layout_height="wrap_content"
            android:layout_gravity="center"
            android:text="Loading..."
            android:textColor="?android:attr/textColorPrimary" />
    </FrameLayout>
  `
}

// ============================================================================
// Preview Layout
// ============================================================================

/**
 * Generates an auto-layout XML for image-based preview.
 * This is used when previewImage is provided but no custom previewLayout.
 */
function generateAutoImagePreviewLayout(widgetId: string, drawableResourceName: string): string {
  return dedent`
    <?xml version="1.0" encoding="utf-8"?>
    <FrameLayout xmlns:android="http://schemas.android.com/apk/res/android"
        android:layout_width="match_parent"
        android:layout_height="match_parent">
        <ImageView
            android:layout_width="match_parent"
            android:layout_height="match_parent"
            android:src="@drawable/${drawableResourceName}"
            android:scaleType="centerCrop"
            android:contentDescription="@string/voltra_widget_${widgetId}_description" />
    </FrameLayout>
  `
}

/**
 * Generates preview layout XML files for all widgets.
 * Returns a map of widgetId to layout resource name.
 *
 * Strategy:
 * - If previewLayout is provided: copy user's custom XML
 * - Else if previewImage is provided: generate auto-layout with ImageView
 * - Otherwise: no preview layout generated
 */
async function generatePreviewLayouts(
  widgets: AndroidWidgetConfig[],
  projectRoot: string,
  layoutPath: string,
  previewImageMap: Map<string, string>
): Promise<Map<string, string>> {
  const previewLayoutMap = new Map<string, string>()

  // Ensure layout directory exists
  if (!fs.existsSync(layoutPath)) {
    fs.mkdirSync(layoutPath, { recursive: true })
  }

  for (const widget of widgets) {
    let layoutContent: string | null = null
    const layoutResourceName = `voltra_widget_${widget.id}_preview`
    const layoutFilePath = path.join(layoutPath, `${layoutResourceName}.xml`)

    // Strategy 1: User provided custom preview layout
    if (widget.previewLayout) {
      const sourcePath = path.join(projectRoot, widget.previewLayout)

      if (!fs.existsSync(sourcePath)) {
        logger.warn(`Preview layout not found for widget '${widget.id}' at ${widget.previewLayout}`)
        continue
      }

      // Copy user's custom XML
      layoutContent = fs.readFileSync(sourcePath, 'utf8')
      logger.info(`Using custom preview layout for widget '${widget.id}'`)
    }
    // Strategy 2: Auto-generate layout from preview image
    else if (widget.previewImage && previewImageMap.has(widget.id)) {
      const drawableResourceName = previewImageMap.get(widget.id)!
      layoutContent = generateAutoImagePreviewLayout(widget.id, drawableResourceName)
      logger.info(`Generated auto preview layout for widget '${widget.id}' from preview image`)
    }

    // Write layout file if we have content
    if (layoutContent) {
      fs.writeFileSync(layoutFilePath, layoutContent, 'utf8')
      previewLayoutMap.set(widget.id, layoutResourceName)
    }
  }

  return previewLayoutMap
}
