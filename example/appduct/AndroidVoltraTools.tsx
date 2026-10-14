// Appduct tools for the Android Voltra surfaces: Home Screen widgets, Dynamic Widgets, per-widget
// and per-placement configuration, and ongoing notifications. This component is rendered only on
// Android (see `AppductTools.tsx`), so an iOS session never sees these tools in `appduct tools`.
//
// Android is not iOS with different names: placements are addressed by `appWidgetId` rather than
// by family, pinning a widget is an app-initiated system dialog, and the Live Activity equivalent
// is an ongoing notification driven by a serializable payload. The tools mirror that.
import { useAppductTool } from '@appduct/react-native'
import {
  clearAllAndroidWidgets,
  clearAndroidWidget,
  clearWidgetInstanceConfiguration,
  clearWidgetServerUpdate,
  endAllAndroidOngoingNotifications,
  getActiveWidgets,
  getAndroidOngoingNotificationCapabilities,
  getAndroidOngoingNotificationStatus,
  getWidgetConfiguration,
  getWidgetInstanceConfiguration,
  getWidgetServerUpdate,
  hasAndroidNotificationPermission,
  reloadAndroidWidgets,
  requestAndroidNotificationPermission,
  requestPinAndroidWidget,
  setWidgetConfiguration,
  setWidgetInstanceConfiguration,
  setWidgetServerUpdate,
  startAndroidOngoingNotification,
  stopAndroidOngoingNotification,
  updateAndroidDynamicWidget,
  updateAndroidOngoingNotification,
  type AndroidDynamicWidgetProps,
  type AndroidOngoingNotificationPayload,
  type WidgetServerUpdateSettings,
} from '@use-voltra/android-client'
import { useRouter } from 'expo-router'
import { z } from 'zod'

import { asProps, OK, okSchema, propsSchema, serverUpdateSettingsSchema } from './shared'

/** Every tool below is listed under `voltra/android`, so `appduct tools --group voltra/android` shows the Android set alone. */
const GROUP = 'voltra/android'

/** Routes the Android side of the example app can be driven to without tapping through the tab bar. */
const ANDROID_ROUTES = [
  '/',
  '/android/activity',
  '/android/widgets',
  '/android/others',
  '/android-widgets',
  '/android-widgets/dynamic-widget',
  '/android-widgets/pin',
  '/android-widgets/instance-config',
  '/android-widgets/preview',
  '/android-widgets/charts',
  '/android-widgets/components',
  '/android-widgets/custom-fonts',
  '/android-widgets/gradient-playground',
  '/android-widgets/image-fallback',
  '/android-widgets/image-preloading',
  '/android-widgets/material-colors',
  '/android-widgets/server-driven',
  '/testing-grounds',
  '/testing-grounds/android-ongoing-notification',
] as const

const widgetInfoSchema = z.object({
  widgetType: z.string().describe('Voltra widget id from app.json.'),
  appWidgetId: z.number().int().describe('Android instance id of this placement. Each placement has its own.'),
  providerClassName: z.string(),
  label: z.string(),
  width: z.number().describe('Reported width in dp.'),
  height: z.number().describe('Reported height in dp.'),
})

/**
 * The serializable half of `AndroidOngoingNotificationInput`. The JSX half cannot cross the wire,
 * and it does not need to: a payload drives the same notification and is what an agent can build.
 */
const ongoingNotificationPayloadSchema = z.discriminatedUnion('kind', [
  z.object({
    v: z.literal(1),
    kind: z.literal('progress'),
    title: z.string().optional(),
    subText: z.string().optional(),
    text: z.string().optional(),
    value: z.number(),
    max: z.number(),
    indeterminate: z.boolean().optional(),
    shortCriticalText: z.string().optional(),
    when: z.number().optional(),
    chronometer: z.boolean().optional(),
  }),
  z.object({
    v: z.literal(1),
    kind: z.literal('bigText'),
    title: z.string().optional(),
    subText: z.string().optional(),
    text: z.string(),
    bigText: z.string().optional(),
    shortCriticalText: z.string().optional(),
    when: z.number().optional(),
    chronometer: z.boolean().optional(),
  }),
])

const notificationResultSchema = z.object({
  ok: z.boolean(),
  notificationId: z.string(),
  action: z.string().optional(),
  reason: z.string().optional(),
})

export function AndroidVoltraTools() {
  const router = useRouter()

  // --- App navigation -------------------------------------------------------------------------

  useAppductTool({
    name: 'android_open_screen',
    group: GROUP,
    description:
      'Navigate the example app to an Android screen. Use this instead of tapping through the tab bar to reach the screen a test needs.',
    inputSchema: z.object({
      route: z.enum(ANDROID_ROUTES).describe('Expo Router path of the screen to open.'),
    }),
    outputSchema: okSchema,
    handler: async ({ route }) => {
      router.push(route)
      return OK
    },
  })

  // --- Widgets --------------------------------------------------------------------------------

  useAppductTool({
    name: 'android_list_widgets',
    group: GROUP,
    description:
      'List every widget placement on the Home Screen with its appWidgetId. The same widget placed twice appears twice; the appWidgetId is what the per-placement configuration tools address.',
    annotations: { readOnlyHint: true },
    outputSchema: z.object({ widgets: z.array(widgetInfoSchema) }),
    handler: async () => {
      const widgets = await getActiveWidgets()
      return {
        widgets: widgets.map(({ widgetType, appWidgetId, providerClassName, label, width, height }) => ({
          widgetType,
          appWidgetId,
          providerClassName,
          label,
          width,
          height,
        })),
      }
    },
  })

  useAppductTool({
    name: 'android_request_pin_widget',
    group: GROUP,
    description:
      'Ask Android to show its "Add widget" dialog for one widget. This is how a test gets a placement without driving the launcher’s widget picker. The user still has to confirm the system dialog.',
    inputSchema: z.object({
      widgetId: z.string().describe('Voltra widget id from app.json, for example "AndroidClientDemoWidget".'),
      previewWidth: z.number().optional().describe('Preview width in dp shown in the system dialog.'),
      previewHeight: z.number().optional().describe('Preview height in dp shown in the system dialog.'),
    }),
    outputSchema: z.object({
      requested: z.boolean().describe('Whether the launcher accepted the request and showed its dialog.'),
    }),
    handler: async ({ widgetId, previewWidth, previewHeight }) => ({
      requested: await requestPinAndroidWidget(widgetId, { previewWidth, previewHeight }),
    }),
  })

  useAppductTool({
    name: 'android_reload_widgets',
    group: GROUP,
    description: 'Re-render placed widgets. Pass widget ids to reload only those, or omit them to reload every widget.',
    inputSchema: z.object({
      widgetIds: z.array(z.string()).optional().describe('Widget ids from app.json. Omit for all widgets.'),
    }),
    outputSchema: okSchema,
    handler: async ({ widgetIds }) => {
      await reloadAndroidWidgets(widgetIds)
      return OK
    },
  })

  useAppductTool({
    name: 'android_update_dynamic_widget',
    group: GROUP,
    description:
      'Replace a Dynamic Widget’s props and re-render every placement of it. The fastest way to put a widget into a known state for a screenshot assertion.',
    inputSchema: z.object({
      widgetId: z.string().describe('Dynamic Widget id from app.json, for example "AndroidClientDemoWidget".'),
      props: propsSchema.describe('Complete props record. Every update replaces the previous one.'),
    }),
    outputSchema: okSchema,
    handler: async ({ widgetId, props }) => {
      await updateAndroidDynamicWidget(widgetId, asProps<AndroidDynamicWidgetProps>(props))
      return OK
    },
  })

  useAppductTool({
    name: 'android_clear_widgets',
    group: GROUP,
    description:
      'Drop the stored payload for one widget, or for every widget when no id is given, so the next render falls back to its initial state.',
    annotations: { destructiveHint: true },
    inputSchema: z.object({
      widgetId: z.string().optional().describe('Widget id to clear. Omit to clear every widget.'),
    }),
    outputSchema: okSchema,
    handler: async ({ widgetId }) => {
      await (widgetId === undefined ? clearAllAndroidWidgets() : clearAndroidWidget(widgetId))
      return OK
    },
  })

  // --- Widget configuration -------------------------------------------------------------------

  useAppductTool({
    name: 'android_get_widget_configuration',
    group: GROUP,
    description:
      'Read a Dynamic Widget’s `env.configuration`. Pass `appWidgetId` for one placement’s own values, or `widgetId` for the values shared by placements that have none of their own.',
    annotations: { readOnlyHint: true },
    inputSchema: z.object({
      widgetId: z.string().optional().describe('Voltra widget id, for the widget-type configuration.'),
      appWidgetId: z.number().int().optional().describe('Placement id from `android_list_widgets`.'),
    }),
    outputSchema: z.object({ configuration: z.record(z.string(), z.string()) }),
    handler: async ({ widgetId, appWidgetId }) => {
      if (appWidgetId !== undefined) {
        return { configuration: await getWidgetInstanceConfiguration(appWidgetId) }
      }
      if (widgetId === undefined) {
        throw new Error('Pass either `widgetId` or `appWidgetId`.')
      }
      return { configuration: await getWidgetConfiguration(widgetId) }
    },
  })

  useAppductTool({
    name: 'android_set_widget_configuration',
    group: GROUP,
    description:
      'Write `env.configuration` values and re-render. Pass `appWidgetId` to give one placement its own values — the stand-in for the system Edit Widget dialog — or `widgetId` to write the values shared by placements that have none.',
    inputSchema: z.object({
      widgetId: z.string().optional().describe('Voltra widget id, for the widget-type configuration.'),
      appWidgetId: z.number().int().optional().describe('Placement id from `android_list_widgets`.'),
      values: z
        .record(z.string(), z.string())
        .describe('Configuration keys to write, for example { "city": "Paris" }.'),
    }),
    outputSchema: okSchema,
    handler: async ({ widgetId, appWidgetId, values }) => {
      if (appWidgetId !== undefined) {
        await setWidgetInstanceConfiguration(appWidgetId, values)
        return OK
      }
      if (widgetId === undefined) {
        throw new Error('Pass either `widgetId` or `appWidgetId`.')
      }
      for (const [key, value] of Object.entries(values)) {
        await setWidgetConfiguration(widgetId, key, value)
      }
      return OK
    },
  })

  useAppductTool({
    name: 'android_clear_widget_instance_configuration',
    group: GROUP,
    description: 'Drop one placement’s own configuration, so it falls back to the widget-type values again.',
    annotations: { destructiveHint: true },
    inputSchema: z.object({
      appWidgetId: z.number().int().describe('Placement id from `android_list_widgets`.'),
    }),
    outputSchema: okSchema,
    handler: async ({ appWidgetId }) => {
      await clearWidgetInstanceConfiguration(appWidgetId)
      return OK
    },
  })

  // --- Server-driven widgets ------------------------------------------------------------------

  useAppductTool({
    name: 'android_set_widget_server_update',
    group: GROUP,
    description:
      'Override a server-driven widget’s serverUpdate settings at runtime, for example to point it at a local fake server. Scoped to one widget, or to every server-driven widget when no id is given.',
    inputSchema: z.object({
      settings: serverUpdateSettingsSchema.describe('Replaces the whole layer, so send every field you want to keep.'),
      widgetId: z.string().optional().describe('Widget id to scope the settings to. Omit for the global layer.'),
    }),
    outputSchema: okSchema,
    handler: async ({ settings, widgetId }) => {
      await setWidgetServerUpdate(settings as WidgetServerUpdateSettings, widgetId ? { widgetId } : undefined)
      return OK
    },
  })

  useAppductTool({
    name: 'android_get_widget_server_update',
    group: GROUP,
    description:
      'Read back what a widget would fetch with right now (every layer flattened), or the raw global layer when no id is given.',
    annotations: { readOnlyHint: true },
    inputSchema: z.object({
      widgetId: z.string().optional().describe('Widget id to resolve settings for. Omit to read the global layer.'),
    }),
    outputSchema: z.object({ settings: z.record(z.string(), z.unknown()).nullable() }),
    handler: async ({ widgetId }) => {
      const settings = widgetId ? await getWidgetServerUpdate({ widgetId }) : await getWidgetServerUpdate()
      return { settings: settings ?? null }
    },
  })

  useAppductTool({
    name: 'android_clear_widget_server_update',
    group: GROUP,
    description:
      'Drop runtime serverUpdate overrides so the widget falls back to app.json. Clearing the global layer also drops what the server last sent to every server-driven widget.',
    annotations: { destructiveHint: true },
    inputSchema: z.object({
      widgetId: z.string().optional().describe('Widget id to clear. Omit to clear the global layer.'),
    }),
    outputSchema: okSchema,
    handler: async ({ widgetId }) => {
      await clearWidgetServerUpdate(widgetId ? { widgetId } : undefined)
      return OK
    },
  })

  // --- Ongoing notifications ------------------------------------------------------------------

  useAppductTool({
    name: 'android_notification_permission',
    group: GROUP,
    description:
      'Check whether the app may post notifications, and request the permission when it may not. Run this before starting an ongoing notification on Android 13+.',
    inputSchema: z.object({
      request: z
        .boolean()
        .optional()
        .describe('Show the system permission prompt when not already granted. Defaults to false.'),
    }),
    outputSchema: z.object({ granted: z.boolean() }),
    handler: async ({ request }) => {
      const granted = await hasAndroidNotificationPermission()
      if (granted || !request) {
        return { granted }
      }
      return { granted: await requestAndroidNotificationPermission() }
    },
  })

  useAppductTool({
    name: 'android_start_ongoing_notification',
    group: GROUP,
    description:
      'Post an ongoing notification from a payload — the Android counterpart of starting a Live Activity. Fails with reason "already_exists" when that notification id is already live.',
    inputSchema: z.object({
      payload: ongoingNotificationPayloadSchema.describe('Progress or bigText notification content.'),
      channelId: z.string().describe('Notification channel id, for example "voltra_live_updates".'),
      notificationId: z.string().optional().describe('Id to address this notification by. Generated when omitted.'),
      smallIcon: z.string().optional(),
      deepLinkUrl: z.string().optional().describe('URL opened when the notification is tapped.'),
      requestPromotedOngoing: z
        .boolean()
        .optional()
        .describe('Ask for a promoted ongoing notification on Android 16+.'),
    }),
    outputSchema: notificationResultSchema,
    handler: async ({ payload, ...options }) =>
      startAndroidOngoingNotification(payload as AndroidOngoingNotificationPayload, options),
  })

  useAppductTool({
    name: 'android_update_ongoing_notification',
    group: GROUP,
    description:
      'Replace a live ongoing notification’s content. Fails with reason "not_found" or "dismissed" when it is no longer showing.',
    inputSchema: z.object({
      notificationId: z.string(),
      payload: ongoingNotificationPayloadSchema,
      channelId: z.string().optional(),
      deepLinkUrl: z.string().optional(),
    }),
    outputSchema: notificationResultSchema,
    handler: async ({ notificationId, payload, ...options }) =>
      updateAndroidOngoingNotification(notificationId, payload as AndroidOngoingNotificationPayload, options),
  })

  useAppductTool({
    name: 'android_stop_ongoing_notification',
    group: GROUP,
    description: 'Dismiss one ongoing notification.',
    annotations: { destructiveHint: true },
    inputSchema: z.object({ notificationId: z.string() }),
    outputSchema: notificationResultSchema,
    handler: async ({ notificationId }) => stopAndroidOngoingNotification(notificationId),
  })

  useAppductTool({
    name: 'android_ongoing_notification_status',
    group: GROUP,
    description:
      'Report whether an ongoing notification is live, dismissed, or promoted, together with what this device supports. Use it to tell a real failure apart from an unsupported API level.',
    annotations: { readOnlyHint: true },
    inputSchema: z.object({ notificationId: z.string() }),
    outputSchema: z.object({
      status: z.object({
        isActive: z.boolean(),
        isDismissed: z.boolean(),
        isPromoted: z.boolean().optional(),
        hasPromotableCharacteristics: z.boolean().optional(),
      }),
      capabilities: z.object({
        apiLevel: z.number(),
        notificationsEnabled: z.boolean(),
        supportsPromotedNotifications: z.boolean(),
        canPostPromotedNotifications: z.boolean(),
        canRequestPromotedOngoing: z.boolean(),
      }),
    }),
    handler: async ({ notificationId }) => ({
      status: getAndroidOngoingNotificationStatus(notificationId),
      capabilities: getAndroidOngoingNotificationCapabilities(),
    }),
  })

  // --- Reset ----------------------------------------------------------------------------------

  useAppductTool({
    name: 'android_reset',
    group: GROUP,
    description:
      'Reset every Android Voltra surface between test cases: dismiss all ongoing notifications, clear all widget payloads, and drop runtime server-update overrides. Placements themselves are left alone — removing those needs the launcher.',
    annotations: { destructiveHint: true, idempotentHint: true },
    outputSchema: okSchema,
    handler: async () => {
      await endAllAndroidOngoingNotifications()
      await clearAllAndroidWidgets()
      await clearWidgetServerUpdate()
      return OK
    },
  })

  return null
}
