import { ConfigPlugin, withAndroidManifest } from '@expo/config-plugins'
import { AndroidConfig } from 'expo/config-plugins'

import type { AndroidWidgetConfig } from '../types'
import { androidWidgetResourceId } from './resourceName'

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
      // The headless event service (ADR 0015): a `shortService` foreground service, which needs no
      // type-specific permission, and the wake lock React Native's headless start takes.
      ensurePermission('android.permission.FOREGROUND_SERVICE')
      ensurePermission('android.permission.WAKE_LOCK')
    }

    config.modResults.manifest['uses-permission'] = usesPermissions

    const existingReceivers = (mainApplication.receiver || []) as any[]
    // The dismissed receiver records swipes and timeouts; the action receiver turns a press on an
    // event action into an `interaction` event (ADR 0015). Neither is reachable from other apps.
    const ongoingNotificationReceiverNames = [
      'voltra.VoltraOngoingNotificationDismissedReceiver',
      'voltra.VoltraOngoingNotificationActionReceiver',
    ]

    if (enableNotifications) {
      for (const receiverName of ongoingNotificationReceiverNames) {
        const hasReceiver = existingReceivers.some((receiver: any) => receiver.$?.['android:name'] === receiverName)

        if (!hasReceiver) {
          existingReceivers.push({
            $: {
              'android:name': receiverName,
              'android:exported': 'false',
            },
          })
        }
      }
      mainApplication.receiver = existingReceivers
    }

    // Starts the app's JavaScript in the background when a notification action is pressed while the
    // app is in the background or not running (ADR 0015).
    const headlessEventServiceName = 'voltra.events.VoltraHeadlessEventService'
    if (enableNotifications) {
      const existingServices = (mainApplication.service || []) as any[]
      const hasHeadlessEventService = existingServices.some(
        (service: any) => service.$?.['android:name'] === headlessEventServiceName
      )
      if (!hasHeadlessEventService) {
        existingServices.push({
          $: {
            'android:name': headlessEventServiceName,
            'android:exported': 'false',
            'android:foregroundServiceType': 'shortService',
          },
        })
        mainApplication.service = existingServices
      }
    }

    // Add a receiver for each widget
    for (const widget of widgets) {
      const receiverClassName = `.widget.VoltraWidget_${widget.id}Receiver`
      const resId = androidWidgetResourceId(widget.id)

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
    }

    return config
  })
}
