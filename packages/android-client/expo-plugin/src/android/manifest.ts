import { ConfigPlugin, withAndroidManifest } from '@expo/config-plugins'
import { AndroidConfig } from 'expo/config-plugins'

import { CONFIGURE_ACTIVITY_NAME } from '../constants'
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

    // The configuration activity (ADR 0015), declared only while a widget opts in, so an app that
    // does not use it exports no extra activity. Removed again when none does.
    const activities = ((mainApplication.activity || []) as any[]).filter(
      (activity: any) => activity.$?.['android:name'] !== CONFIGURE_ACTIVITY_NAME
    )
    if (widgets.some((widget) => widget.configurationScreen === true)) {
      activities.push({
        $: {
          'android:name': CONFIGURE_ACTIVITY_NAME,
          // The launcher starts it, so it must be exported; it checks the placement is ours.
          'android:exported': 'true',
          'android:excludeFromRecents': 'true',
          'android:theme': '@android:style/Theme.Translucent.NoTitleBar',
          // Keeps the open dialog and unsaved picks across rotation instead of recreating the screen.
          'android:configChanges': 'orientation|screenSize|screenLayout|keyboardHidden',
        },
        'intent-filter': [
          {
            action: [{ $: { 'android:name': 'android.appwidget.action.APPWIDGET_CONFIGURE' } }],
          },
        ],
      })
    }
    mainApplication.activity = activities

    return config
  })
}
