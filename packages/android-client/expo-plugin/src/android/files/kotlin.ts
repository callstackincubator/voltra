import dedent from 'dedent'
import * as fs from 'fs'
import * as path from 'path'

import { widgetLabelEnglish } from '@use-voltra/expo-plugin'

import type { DetectedAndroidWidget } from '../clientRendered'

export interface GenerateKotlinFilesProps {
  platformProjectRoot: string
  packageName: string
  widgets: DetectedAndroidWidget[]
  scheme?: string
  widgetConfigurationRoute?: string
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

/**
 * Generates ReactActivity bridge classes for widgets that expose appIntent parameters.
 *
 * The generated activity is a thin trampoline that deep-links into the host app's JS route,
 * where the example app can render a widget-configuration form and finish the activity once the
 * instance settings are saved.
 */
export async function generateWidgetConfigurationActivities(props: GenerateKotlinFilesProps): Promise<void> {
  const { platformProjectRoot, packageName, widgets, scheme, widgetConfigurationRoute } = props
  const configurableWidgets = widgets.filter(
    (widget) => widget.clientRendered && (widget.appIntent?.parameters?.length ?? 0) > 0
  )

  if (configurableWidgets.length === 0) {
    return
  }

  const packagePath = packageName.replace(/\./g, '/')
  const widgetDir = path.join(platformProjectRoot, 'app', 'src', 'main', 'java', packagePath, 'widget')

  if (!fs.existsSync(widgetDir)) {
    fs.mkdirSync(widgetDir, { recursive: true })
  }

  for (const widget of configurableWidgets) {
    const className = `VoltraWidget_${widget.id}ConfigurationActivity`
    const filePath = path.join(widgetDir, `${className}.kt`)
    const content = generateWidgetConfigurationActivityClass(widget, packageName, scheme, widgetConfigurationRoute)

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
function generateWidgetReceiverClass(widget: DetectedAndroidWidget, packageName: string): string {
  const className = `VoltraWidget_${widget.id}Receiver`
  const labelForComment = widgetLabelEnglish(widget.displayName)

  // Dynamic Widgets host VoltraClientGlanceWidget (on-device JS render) and have no
  // server payload, so they never schedule WorkManager server updates.
  if (widget.clientRendered) {
    return dedent`
      package ${packageName}.widget

      import voltra.widget.VoltraClientWidgetReceiver

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
    const refreshEnabled = widget.serverUpdate.refresh === true
    // Widget with server-driven updates: schedule WorkManager periodic task
    return dedent`
      package ${packageName}.widget

      import android.appwidget.AppWidgetManager
      import android.content.Context
      import voltra.widget.VoltraWidgetReceiver
      import voltra.widget.VoltraWidgetUpdateScheduler

      /**
       * Auto-generated widget receiver for ${labelForComment}
       * Widget ID: ${widget.id}
       * Server Update: ${widget.serverUpdate.url} (every ${widget.serverUpdate.intervalMinutes ?? 15} minutes)
       * Refresh Button: ${refreshEnabled}
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
                  intervalMinutes = ${widget.serverUpdate.intervalMinutes ?? 15}L,
                  refreshEnabled = ${refreshEnabled}
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
     * Auto-generated widget receiver for ${labelForComment}
     * Widget ID: ${widget.id}
     */
    class ${className} : VoltraWidgetReceiver() {
        override val widgetId: String = "${widget.id}"
    }
  `
}

function generateWidgetConfigurationActivityClass(
  widget: DetectedAndroidWidget,
  packageName: string,
  scheme?: string,
  widgetConfigurationRoute?: string
): string {
  const className = `VoltraWidget_${widget.id}ConfigurationActivity`
  const labelForComment = widgetLabelEnglish(widget.displayName)
  const widgetConfigScheme = escapeKotlinString(normalizeWidgetConfigurationScheme(scheme ?? packageName))
  const widgetConfigRoute = escapeKotlinString(normalizeWidgetConfigurationRoute(widgetConfigurationRoute))
  const widgetId = escapeKotlinString(widget.id)

  return dedent`
    package ${packageName}.widget

    import android.app.Activity
    import android.appwidget.AppWidgetManager
    import android.content.Intent
    import android.net.Uri
    import android.os.Bundle
    import com.facebook.react.ReactActivity
    import com.facebook.react.ReactActivityDelegate
    import com.facebook.react.defaults.DefaultNewArchitectureEntryPoint.fabricEnabled
    import com.facebook.react.defaults.DefaultReactActivityDelegate
    import expo.modules.ReactActivityDelegateWrapper
    import ${packageName}.BuildConfig

    /**
     * Auto-generated widget configuration trampoline for ${labelForComment}
     * Widget ID: ${widget.id}
     */
    class ${className} : ReactActivity() {
        override fun getMainComponentName(): String = "main"

        override fun createReactActivityDelegate(): ReactActivityDelegate {
            return ReactActivityDelegateWrapper(
                this,
                BuildConfig.IS_NEW_ARCHITECTURE_ENABLED,
                object : DefaultReactActivityDelegate(
                    this,
                    mainComponentName,
                    fabricEnabled,
                ) {},
            )
        }

        override fun onCreate(savedInstanceState: Bundle?) {
            val appWidgetId =
                intent?.getIntExtra(
                    AppWidgetManager.EXTRA_APPWIDGET_ID,
                    AppWidgetManager.INVALID_APPWIDGET_ID,
                ) ?: AppWidgetManager.INVALID_APPWIDGET_ID

            val canceledResult =
                Intent().apply {
                    putExtra(AppWidgetManager.EXTRA_APPWIDGET_ID, appWidgetId)
                }

            if (appWidgetId == AppWidgetManager.INVALID_APPWIDGET_ID) {
                setResult(Activity.RESULT_CANCELED, canceledResult)
                finish()
                return
            }

            val configRoute =
                Uri.parse(
                    "${widgetConfigScheme}://${widgetConfigRoute}?widgetId=${widgetId}&appWidgetId=$appWidgetId",
                )

            setResult(Activity.RESULT_CANCELED, canceledResult)
            setIntent(Intent(intent).apply {
                data = configRoute
            })

            super.onCreate(null)
        }
    }
  `
}

function normalizeWidgetConfigurationRoute(route?: string): string {
  const trimmed = route?.trim() || 'voltraui/android-widget-config'

  const normalized = trimmed.replace(/^\/+/, '').replace(/\/+$/, '')
  if (!normalized) {
    throw new Error('widgetConfigurationRoute must not be empty')
  }

  if (!/^[A-Za-z0-9._/-]+$/.test(normalized)) {
    throw new Error(
      `widgetConfigurationRoute must be a route path made of letters, numbers, periods, underscores, slashes, or hyphens. Got: ${route}`
    )
  }

  return normalized
}

function normalizeWidgetConfigurationScheme(scheme: string): string {
  if (!/^[A-Za-z][A-Za-z0-9+.-]*$/.test(scheme)) {
    throw new Error(`Invalid widget configuration scheme: ${scheme}`)
  }

  return scheme
}

function escapeKotlinString(value: string): string {
  return value.replace(/\\/g, '\\\\').replace(/"/g, '\\"').replace(/\$/g, '\\$')
}
