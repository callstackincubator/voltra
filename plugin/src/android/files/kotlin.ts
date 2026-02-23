import dedent from 'dedent'
import * as fs from 'fs'
import * as path from 'path'

import type { AndroidWidgetConfig } from '../../types'

export interface GenerateKotlinFilesProps {
  platformProjectRoot: string
  packageName: string
  widgets: AndroidWidgetConfig[]
}

// ============================================================================
// Main Function
// ============================================================================

/**
 * Generates Kotlin receiver classes for all configured widgets
 */
export async function generateWidgetReceivers(props: GenerateKotlinFilesProps): Promise<void> {
  const { platformProjectRoot, packageName, widgets } = props

  // Determine the package path (e.g., com.example.app -> com/example/app)
  const packagePath = packageName.replace(/\./g, '/')
  const widgetDir = path.join(platformProjectRoot, 'app', 'src', 'main', 'java', packagePath, 'widget')

  // Ensure the widget directory exists
  if (!fs.existsSync(widgetDir)) {
    fs.mkdirSync(widgetDir, { recursive: true })
  }

  // Generate a receiver class for each widget
  for (const widget of widgets) {
    const className = `VoltraWidget_${widget.id}Receiver`
    const filePath = path.join(widgetDir, `${className}.kt`)
    const content = generateWidgetReceiverClass(widget, packageName)

    fs.writeFileSync(filePath, content, 'utf8')
  }
}

// ============================================================================
// Widget Receiver
// ============================================================================

/**
 * Generates Kotlin code for a single widget receiver class.
 * If the widget has serverUpdate configured, includes WorkManager scheduling.
 */
function generateWidgetReceiverClass(widget: AndroidWidgetConfig, packageName: string): string {
  const className = `VoltraWidget_${widget.id}Receiver`

  if (widget.serverUpdate) {
    // Widget with server-driven updates: schedule WorkManager periodic task
    return dedent`
      package ${packageName}.widget

      import android.appwidget.AppWidgetManager
      import android.content.Context
      import voltra.widget.VoltraWidgetReceiver
      import voltra.widget.VoltraWidgetUpdateScheduler

      /**
       * Auto-generated widget receiver for ${widget.displayName}
       * Widget ID: ${widget.id}
       * Server Update: ${widget.serverUpdate.url} (every ${widget.serverUpdate.intervalMinutes ?? 15} minutes)
       */
      class ${className} : VoltraWidgetReceiver() {
          override val widgetId: String = "${widget.id}"

          override fun onUpdate(context: Context, appWidgetManager: AppWidgetManager, appWidgetIds: IntArray) {
              super.onUpdate(context, appWidgetManager, appWidgetIds)

              // Schedule periodic server updates via WorkManager
              VoltraWidgetUpdateScheduler.schedulePeriodicUpdate(
                  context = context,
                  widgetId = "${widget.id}",
                  serverUrl = "${widget.serverUpdate.url}",
                  intervalMinutes = ${widget.serverUpdate.intervalMinutes ?? 15}L
              )
          }

          override fun onDeleted(context: Context, appWidgetIds: IntArray) {
              super.onDeleted(context, appWidgetIds)

              // Cancel periodic updates when all instances of this widget are removed
              val remaining = appWidgetManager(context, appWidgetIds)
              if (remaining == 0) {
                  VoltraWidgetUpdateScheduler.cancelPeriodicUpdate(context, "${widget.id}")
              }
          }

          private fun appWidgetManager(context: Context, deletedIds: IntArray): Int {
              val manager = AppWidgetManager.getInstance(context)
              val componentName = android.content.ComponentName(context, this::class.java)
              val allIds = manager.getAppWidgetIds(componentName)
              return allIds.count { it !in deletedIds }
          }
      }
    `
  }

  // Standard widget without server updates
  return dedent`
    package ${packageName}.widget

    import voltra.widget.VoltraWidgetReceiver

    /**
     * Auto-generated widget receiver for ${widget.displayName}
     * Widget ID: ${widget.id}
     */
    class ${className} : VoltraWidgetReceiver() {
        override val widgetId: String = "${widget.id}"
    }
  `
}
