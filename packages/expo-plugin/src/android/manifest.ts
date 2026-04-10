import { ConfigPlugin, withAndroidManifest } from '@expo/config-plugins'
import { AndroidConfig } from 'expo/config-plugins'

import type { AndroidWidgetConfig } from '../types'

export interface ConfigureAndroidManifestProps {
  enableNotifications?: boolean
  widgets: AndroidWidgetConfig[]
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

    const usesPermissions = (config.modResults.manifest['uses-permission'] || []) as any[]
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

    const existingReceivers = (mainApplication.receiver || []) as any[]
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

    // Add a receiver for each widget
    for (const widget of widgets) {
      const receiverClassName = `.widget.VoltraWidget_${widget.id}Receiver`

      // Check if receiver already exists
      const alreadyExists = existingReceivers.some(
        (receiver: any) => receiver.$?.['android:name'] === receiverClassName
      )

      if (!alreadyExists) {
        // Create the receiver entry
        const receiver = {
          $: {
            'android:name': receiverClassName,
            'android:exported': 'true' as const,
            'android:label': `@string/voltra_widget_${widget.id}_label`,
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
                'android:resource': `@xml/voltra_widget_${widget.id}_info`,
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
    }

    return config
  })
}
