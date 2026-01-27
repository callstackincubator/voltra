import dedent from 'dedent'
import * as fs from 'fs'
import * as path from 'path'

import type { AndroidWidgetConfig } from '../../../../types'
import { logger } from '../../../../utils'

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
export async function generatePreviewLayouts(
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
