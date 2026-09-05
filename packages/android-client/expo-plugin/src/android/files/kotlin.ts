import dedent from 'dedent'
import * as fs from 'fs'
import * as path from 'path'

import { widgetLabelEnglish } from '@use-voltra/expo-plugin'

import type { DetectedAndroidWidget } from '../clientRendered'

export interface GenerateKotlinFilesProps {
  platformProjectRoot: string
  packageName: string
  widgets: DetectedAndroidWidget[]
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
 *
 * `entry` picks the render engine and `serverUpdate` picks where the data comes from, so the two
 * keys together select one of four base classes. Runtime code never asks "is this server-driven?" —
 * the answer is baked in here, once, at generate time.
 */
function generateWidgetReceiverClass(widget: DetectedAndroidWidget, packageName: string): string {
  const className = `VoltraWidget_${widget.id}Receiver`
  const labelForComment = widgetLabelEnglish(widget.displayName)

  // A widget with an entry and a serverUpdate renders bundled JS from props fetched in the
  // background. The scheduling lives in the base class, so the generated receiver stays a name
  // and an id — the URL and the interval come from widget_server_defaults.json at runtime, where
  // setWidgetServerUpdate can override them.
  if (widget.clientRendered && widget.serverUpdate) {
    return dedent`
      package ${packageName}.widget

      import voltra.dynamicwidget.serverupdate.VoltraServerDrivenClientWidgetReceiver

      /**
       * Auto-generated server-driven Dynamic Widget receiver for ${labelForComment}
       * Widget ID: ${widget.id}
       */
      class ${className} : VoltraServerDrivenClientWidgetReceiver() {
          override val widgetId: String = "${widget.id}"
      }
    `
  }

  // Dynamic Widgets without a serverUpdate host VoltraClientGlanceWidget (on-device JS render)
  // and are driven entirely by the app, so they never schedule background work.
  if (widget.clientRendered) {
    return dedent`
      package ${packageName}.widget

      import voltra.dynamicwidget.VoltraClientWidgetReceiver

      /**
       * Auto-generated Dynamic Widget receiver for ${labelForComment}
       * Widget ID: ${widget.id}
       */
      class ${className} : VoltraClientWidgetReceiver() {
          override val widgetId: String = "${widget.id}"
      }
    `
  }

  if (widget.serverUpdate) {
    // Payload widget with server-driven updates: schedule WorkManager periodic work. The URL and
    // the interval are resolved from widget_server_defaults.json plus any runtime overrides, so
    // they are deliberately not inlined here.
    return dedent`
      package ${packageName}.widget

      import android.appwidget.AppWidgetManager
      import android.content.Context
      import kotlinx.coroutines.CoroutineScope
      import kotlinx.coroutines.Dispatchers
      import kotlinx.coroutines.launch
      import voltra.widget.payload.VoltraPayloadWidgetReceiver
      import voltra.widget.payload.VoltraWidgetUpdateScheduler

      /**
       * Auto-generated widget receiver for ${labelForComment}
       * Widget ID: ${widget.id}
       */
      class ${className} : VoltraPayloadWidgetReceiver() {
          override val widgetId: String = "${widget.id}"

          override fun onUpdate(context: Context, appWidgetManager: AppWidgetManager, appWidgetIds: IntArray) {
              super.onUpdate(context, appWidgetManager, appWidgetIds)

              val applicationContext = context.applicationContext
              CoroutineScope(Dispatchers.Default).launch {
                  VoltraWidgetUpdateScheduler.schedulePeriodicUpdate(applicationContext, "${widget.id}")
              }
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

    import voltra.widget.payload.VoltraPayloadWidgetReceiver

    /**
     * Auto-generated widget receiver for ${labelForComment}
     * Widget ID: ${widget.id}
     */
    class ${className} : VoltraPayloadWidgetReceiver() {
        override val widgetId: String = "${widget.id}"
    }
  `
}
