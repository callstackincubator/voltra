import { ConfigPlugin, withAndroidManifest } from '@expo/config-plugins'
import { AndroidConfig } from 'expo/config-plugins'

import type { DetectedAndroidWidget } from './clientRendered'
import { androidWidgetResourceId } from './resourceName'

export interface ConfigureAndroidManifestProps {
  enableNotifications?: boolean
  widgets: DetectedAndroidWidget[]
}

export function upsertAndroidWidgetManifestEntries(
  mainApplication: any,
  packageName: string,
  widgets: DetectedAndroidWidget[]
): void {
  const existingReceivers = (mainApplication.receiver || []) as any[]
  const existingActivities = (mainApplication.activity || []) as any[]

  // Add a receiver for each widget
  for (const widget of widgets) {
    const receiverClassName = `.widget.VoltraWidget_${widget.id}Receiver`
    const resId = androidWidgetResourceId(widget.id)
    const hasConfiguration = widget.clientRendered && (widget.appIntent?.parameters?.length ?? 0) > 0

    // Check if receiver already exists
    const alreadyExists = existingReceivers.some((receiver: any) => receiver.$?.['android:name'] === receiverClassName)

    if (!alreadyExists) {
      // Create the receiver entry
      const receiver = {
        $: {
          'android:name': receiverClassName,
          'android:exported': 'true' as const,
          'android:label': `@string/voltra_widget_${resId}_label`,
        },
        'intent-filter': [
          {
            action: [
              {
                $: {
                  'android:name': 'android.appwidget.action.APPWIDGET_UPDATE',
                },
              },
            ],
          },
        ],
        'meta-data': [
          {
            $: {
              'android:name': 'android.appwidget.provider',
              'android:resource': `@xml/voltra_widget_${resId}_info`,
            },
          },
        ],
      }

      // Add the receiver to the application
      if (!mainApplication.receiver) {
        mainApplication.receiver = []
      }
      mainApplication.receiver.push(receiver)
    }

    if (hasConfiguration) {
      const activityClassName = `${packageName}.widget.VoltraWidget_${widget.id}ConfigurationActivity`
      const legacyActivityClassName = `.widget.VoltraWidget_${widget.id}ConfigurationActivity`
      const activityAlreadyExists = existingActivities.some(
        (activity: any) =>
          activity.$?.['android:name'] === activityClassName || activity.$?.['android:name'] === legacyActivityClassName
      )

      if (!activityAlreadyExists) {
        if (!mainApplication.activity) {
          mainApplication.activity = []
        }
        mainApplication.activity.push({
          $: {
            'android:name': activityClassName,
            'android:exported': 'true',
            'android:theme': '@android:style/Theme.Translucent.NoTitleBar',
            'android:noHistory': 'true',
          },
          'intent-filter': [
            {
              action: [
                {
                  $: {
                    'android:name': 'android.appwidget.action.APPWIDGET_CONFIGURE',
                  },
                },
              ],
            },
          ],
        })
      }
    }
  }
}

/**
 * Plugin step that adds widget receiver entries to AndroidManifest.xml
 *
 * This adds a <receiver> entry for each widget with:
 * - The generated receiver class name
 * - APPWIDGET_UPDATE intent filter
 * - Widget provider metadata reference
 */
export const configureAndroidManifest: ConfigPlugin<ConfigureAndroidManifestProps> = (config, props) => {
  const { enableNotifications, widgets } = props

  return withAndroidManifest(config, (config) => {
    const mainApplication = AndroidConfig.Manifest.getMainApplicationOrThrow(config.modResults) as any
    const packageName = config.android?.package

    if (!packageName) {
      throw new Error('Voltra Android manifest generation requires expo.android.package to be set.')
    }

    const usesPermissions = (config.modResults.manifest['uses-permission'] || []) as any[]
    const existingReceivers = (mainApplication.receiver || []) as any[]
    const ensurePermission = (permissionName: string) => {
      const exists = usesPermissions.some((permission) => permission.$?.['android:name'] === permissionName)
      if (!exists) {
        usesPermissions.push({
          $: {
            'android:name': permissionName,
          },
        })
      }
    }

    if (enableNotifications) {
      ensurePermission('android.permission.POST_NOTIFICATIONS')
      ensurePermission('android.permission.POST_PROMOTED_NOTIFICATIONS')
    }

    config.modResults.manifest['uses-permission'] = usesPermissions

    const ongoingNotificationReceiverName = 'voltra.VoltraOngoingNotificationDismissedReceiver'

    if (enableNotifications) {
      const hasOngoingNotificationReceiver = existingReceivers.some(
        (receiver: any) => receiver.$?.['android:name'] === ongoingNotificationReceiverName
      )

      if (!hasOngoingNotificationReceiver) {
        existingReceivers.push({
          $: {
            'android:name': ongoingNotificationReceiverName,
            'android:exported': 'false',
          },
        })
        mainApplication.receiver = existingReceivers
      }
    }

    upsertAndroidWidgetManifestEntries(mainApplication, packageName, widgets)

    return config
  })
}
