// Appduct tools for the iOS Voltra surfaces: Home Screen widgets, Dynamic Widgets, Dynamic Live
// Activities, image preloading, and the Voltra event stream. This component is rendered only on
// iOS (see `AppductTools.tsx`), so every hook here registers against an API that exists on the
// device the agent is driving — an Android session never sees these tools in `appduct tools`.
import { postEvent, useAppductTool } from '@appduct/react-native'
import {
  addVoltraListener,
  clearAllWidgets,
  clearPreloadedImages,
  clearWidget,
  clearWidgetServerUpdate,
  endAllLiveActivities,
  getActiveWidgets,
  getDynamicLiveActivityDefinitionIds,
  getWidgetServerUpdate,
  isLiveActivityActive,
  preloadImages,
  reloadWidgets,
  setWidgetServerUpdate,
  startDynamicLiveActivity,
  stopLiveActivity,
  updateDynamicLiveActivity,
  updateDynamicWidget,
  type DynamicLiveActivityProps,
  type DynamicWidgetProps,
  type PreloadImageOptions,
  type WidgetServerUpdateSettings,
} from '@use-voltra/ios-client'
import { useRouter } from 'expo-router'
import { useEffect } from 'react'
import { z } from 'zod'

import { asProps, OK, okSchema, propsSchema, serverUpdateSettingsSchema } from './shared'

/** Every tool below is listed under `voltra/ios`, so `appduct tools --group voltra/ios` shows the iOS set alone. */
const GROUP = 'voltra/ios'

/** Routes the iOS side of the example app can be driven to without tapping through the tab bar. */
const IOS_ROUTES = [
  '/',
  '/ios/activity',
  '/ios/widgets',
  '/ios/others',
  '/live-activities',
  '/ios-widgets/dynamic-widget',
  '/testing-grounds',
  '/testing-grounds/weather',
  '/testing-grounds/timer',
  '/testing-grounds/styling',
  '/testing-grounds/positioning',
  '/testing-grounds/progress',
  '/testing-grounds/components',
  '/testing-grounds/flex-playground',
  '/testing-grounds/chart-playground',
  '/testing-grounds/gradient-playground',
  '/testing-grounds/channel-updates',
  '/testing-grounds/image-preloading',
  '/testing-grounds/image-fallback',
  '/testing-grounds/widget-scheduling',
  '/testing-grounds/server-driven-widgets',
] as const

const VOLTRA_EVENT_KINDS = [
  'interaction',
  'stateChange',
  'activityTokenReceived',
  'activityPushToStartTokenReceived',
  'dynamicLiveActivityRenderFailed',
] as const

const EVENT_LOG_LIMIT = 200

type VoltraEventKind = (typeof VOLTRA_EVENT_KINDS)[number]

type LoggedVoltraEvent = {
  kind: VoltraEventKind
  receivedAt: string
  event: Record<string, unknown>
}

/**
 * Widget and Live Activity interactions arrive asynchronously, long after the tool call that
 * caused them returned. Buffering them here is what lets an agent assert on a Home Screen button
 * press: drive the surface, then read the log back with `ios_read_events`.
 */
let eventLog: LoggedVoltraEvent[] = []

/** Live Activities started through these tools, so `ios_live_activity_status` can list them. */
const startedActivities = new Set<string>()

const widgetInfoSchema = z.object({
  name: z.string(),
  kind: z.string(),
  family: z.string(),
})

const preloadImageSizeShape = {
  key: z.string().describe('Key the widget or Live Activity references this image by.'),
  width: z.number().optional(),
  height: z.number().optional(),
}

/** An image is preloaded either from a URL or from inline SVG source, never from both. */
const preloadImageSchema = z.union([
  z.object({
    ...preloadImageSizeShape,
    url: z.string().describe('Remote image to download.'),
    method: z.enum(['GET', 'POST', 'PUT']).optional(),
    headers: z.record(z.string(), z.string()).optional(),
  }),
  z.object({
    ...preloadImageSizeShape,
    svg: z.string().describe('Inline SVG source to rasterize.'),
  }),
])

export function IosVoltraTools() {
  const router = useRouter()

  useEffect(() => {
    const subscriptions = VOLTRA_EVENT_KINDS.map((kind) =>
      addVoltraListener(kind, (event) => {
        eventLog = [
          ...eventLog,
          { kind, receivedAt: new Date().toISOString(), event: event as unknown as Record<string, unknown> },
        ].slice(-EVENT_LOG_LIMIT)
        // Also push it onto Appduct's event stream, so `appduct events` can follow interactions
        // live instead of polling `ios_read_events`.
        void postEvent(`voltra.${kind}`, event).catch(() => {})
      })
    )

    return () => subscriptions.forEach((subscription) => subscription.remove())
  }, [])

  // --- App navigation -------------------------------------------------------------------------

  useAppductTool({
    name: 'ios_open_screen',
    group: GROUP,
    description:
      'Navigate the example app to an iOS screen. Use this instead of tapping through the tab bar to reach the screen a test needs.',
    inputSchema: z.object({
      route: z.enum(IOS_ROUTES).describe('Expo Router path of the screen to open.'),
    }),
    outputSchema: okSchema,
    handler: async ({ route }) => {
      router.push(route)
      return OK
    },
  })

  // --- Widgets --------------------------------------------------------------------------------

  useAppductTool({
    name: 'ios_list_widgets',
    group: GROUP,
    description:
      'List the widgets currently placed on the Home Screen, with the family each placement uses. Read this before asserting on a widget render.',
    annotations: { readOnlyHint: true },
    outputSchema: z.object({ widgets: z.array(widgetInfoSchema) }),
    handler: async () => {
      const widgets = await getActiveWidgets()
      return { widgets: widgets.map(({ name, kind, family }) => ({ name, kind, family })) }
    },
  })

  useAppductTool({
    name: 'ios_reload_widgets',
    group: GROUP,
    description:
      'Ask WidgetKit to re-render placed widgets. Pass widget ids to reload only those, or omit them to reload every widget.',
    inputSchema: z.object({
      widgetIds: z.array(z.string()).optional().describe('Widget ids from app.json. Omit for all widgets.'),
    }),
    outputSchema: okSchema,
    handler: async ({ widgetIds }) => {
      await reloadWidgets(widgetIds)
      return OK
    },
  })

  useAppductTool({
    name: 'ios_update_dynamic_widget',
    group: GROUP,
    description:
      'Replace a Dynamic Widget’s props and re-render it. This is the fastest way to put a widget into a known state for a screenshot assertion.',
    inputSchema: z.object({
      widgetId: z.string().describe('Dynamic Widget id from app.json, for example "ClientRenderedDemoWidget".'),
      props: propsSchema.describe('Complete props record. Every update replaces the previous one.'),
    }),
    outputSchema: okSchema,
    handler: async ({ widgetId, props }) => {
      await updateDynamicWidget(widgetId, asProps<DynamicWidgetProps>(props))
      return OK
    },
  })

  useAppductTool({
    name: 'ios_clear_widgets',
    group: GROUP,
    description:
      'Drop the stored payload for one widget, or for every widget when no id is given, so the next render falls back to its initial state.',
    annotations: { destructiveHint: true },
    inputSchema: z.object({
      widgetId: z.string().optional().describe('Widget id to clear. Omit to clear every widget.'),
    }),
    outputSchema: okSchema,
    handler: async ({ widgetId }) => {
      await (widgetId === undefined ? clearAllWidgets() : clearWidget(widgetId))
      return OK
    },
  })

  // --- Server-driven widgets ------------------------------------------------------------------

  useAppductTool({
    name: 'ios_set_widget_server_update',
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
    name: 'ios_get_widget_server_update',
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
    name: 'ios_clear_widget_server_update',
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

  // --- Live Activities ------------------------------------------------------------------------

  useAppductTool({
    name: 'ios_list_live_activity_definitions',
    group: GROUP,
    description:
      'List the Dynamic Live Activity definition ids bundled in this build. These are the ids `ios_start_live_activity` accepts.',
    annotations: { readOnlyHint: true },
    outputSchema: z.object({ definitionIds: z.array(z.string()) }),
    handler: async () => ({ definitionIds: await getDynamicLiveActivityDefinitionIds() }),
  })

  useAppductTool({
    name: 'ios_start_live_activity',
    group: GROUP,
    description:
      'Start a bundled Dynamic Live Activity with a props record, and return the activity name the other Live Activity tools address it by.',
    inputSchema: z.object({
      definitionId: z.string().describe('Definition id from `ios_list_live_activity_definitions`.'),
      props: propsSchema.optional().describe('Complete props record for the definition’s render.'),
      activityName: z.string().optional().describe('Name to address this activity by. Generated when omitted.'),
      deepLinkUrl: z.string().optional().describe('URL opened when the Live Activity itself is tapped.'),
      channelId: z.string().optional().describe('Broadcast channel id, for push-driven updates.'),
      staleDate: z.number().optional().describe('Unix seconds after which the content counts as stale.'),
      relevanceScore: z.number().optional(),
    }),
    outputSchema: z.object({ activityName: z.string() }),
    handler: async ({ definitionId, props, activityName, deepLinkUrl, channelId, staleDate, relevanceScore }) => {
      const name = await startDynamicLiveActivity(definitionId, asProps<DynamicLiveActivityProps>(props ?? {}), {
        activityName,
        deepLinkUrl,
        channelId,
        staleDate,
        relevanceScore,
      })
      startedActivities.add(name)
      return { activityName: name }
    },
  })

  useAppductTool({
    name: 'ios_update_live_activity',
    group: GROUP,
    description:
      'Replace a running Dynamic Live Activity’s props. Send the complete record — an update is a replacement, not a merge.',
    inputSchema: z.object({
      activityName: z.string().describe('Activity name returned by `ios_start_live_activity`.'),
      props: propsSchema,
      staleDate: z.number().optional(),
      relevanceScore: z.number().optional(),
    }),
    outputSchema: okSchema,
    handler: async ({ activityName, props, staleDate, relevanceScore }) => {
      await updateDynamicLiveActivity(activityName, asProps<DynamicLiveActivityProps>(props), {
        staleDate,
        relevanceScore,
      })
      return OK
    },
  })

  useAppductTool({
    name: 'ios_stop_live_activity',
    group: GROUP,
    description: 'End one Live Activity, optionally dismissing it from the Lock Screen immediately.',
    annotations: { destructiveHint: true },
    inputSchema: z.object({
      activityName: z.string(),
      dismissImmediately: z
        .boolean()
        .optional()
        .describe('Dismiss right away instead of leaving the ended activity on the Lock Screen.'),
    }),
    outputSchema: okSchema,
    handler: async ({ activityName, dismissImmediately }) => {
      await stopLiveActivity(activityName, dismissImmediately ? { dismissalPolicy: 'immediate' } : undefined)
      startedActivities.delete(activityName)
      return OK
    },
  })

  useAppductTool({
    name: 'ios_live_activity_status',
    group: GROUP,
    description:
      'Report whether a Live Activity is running. With no name, reports every activity these tools started in this session.',
    annotations: { readOnlyHint: true },
    inputSchema: z.object({
      activityName: z.string().optional(),
    }),
    outputSchema: z.object({
      activities: z.array(z.object({ activityName: z.string(), isActive: z.boolean() })),
    }),
    handler: async ({ activityName }) => {
      const names = activityName === undefined ? [...startedActivities] : [activityName]
      return { activities: names.map((name) => ({ activityName: name, isActive: isLiveActivityActive(name) })) }
    },
  })

  // --- Images ---------------------------------------------------------------------------------

  useAppductTool({
    name: 'ios_preload_images',
    group: GROUP,
    description:
      'Preload images into shared storage so widgets and Live Activities can render them. Reports which keys succeeded and why the rest failed.',
    timeoutMs: 30_000,
    inputSchema: z.object({
      images: z.array(preloadImageSchema).describe('Each entry needs a `key` plus either `url` or `svg`.'),
    }),
    outputSchema: z.object({
      succeeded: z.array(z.string()),
      failed: z.array(z.object({ key: z.string(), error: z.string() })),
    }),
    handler: async ({ images }) => preloadImages(images as PreloadImageOptions[]),
  })

  useAppductTool({
    name: 'ios_clear_preloaded_images',
    group: GROUP,
    description: 'Drop preloaded images by key, or all of them when no keys are given.',
    annotations: { destructiveHint: true },
    inputSchema: z.object({ keys: z.array(z.string()).optional() }),
    outputSchema: okSchema,
    handler: async ({ keys }) => {
      await clearPreloadedImages(keys)
      return OK
    },
  })

  // --- Events ---------------------------------------------------------------------------------

  useAppductTool({
    name: 'ios_read_events',
    group: GROUP,
    description:
      'Read Voltra events the app received — widget and Live Activity interactions, activity state changes, push tokens, Dynamic Live Activity render failures. This is how you assert that a Home Screen tap reached the app.',
    inputSchema: z.object({
      kind: z.enum(VOLTRA_EVENT_KINDS).optional().describe('Only return events of this kind.'),
      limit: z.number().int().positive().optional().describe('Most recent events to return. Defaults to 50.'),
      drain: z
        .boolean()
        .optional()
        .describe('Clear the returned events from the buffer, so the next call only sees new ones. Defaults to true.'),
    }),
    outputSchema: z.object({
      events: z.array(
        z.object({
          kind: z.enum(VOLTRA_EVENT_KINDS),
          receivedAt: z.string(),
          event: z.record(z.string(), z.unknown()),
        })
      ),
    }),
    handler: async ({ kind, limit, drain }) => {
      const matching = kind === undefined ? eventLog : eventLog.filter((entry) => entry.kind === kind)
      const events = matching.slice(-(limit ?? 50))

      if (drain ?? true) {
        const returned = new Set(events)
        eventLog = eventLog.filter((entry) => !returned.has(entry))
      }

      return { events }
    },
  })

  // --- Reset ----------------------------------------------------------------------------------

  useAppductTool({
    name: 'ios_reset',
    group: GROUP,
    description:
      'Reset every iOS Voltra surface between test cases: end all Live Activities, clear all widget payloads, drop runtime server-update overrides, and empty the event buffer.',
    annotations: { destructiveHint: true, idempotentHint: true },
    outputSchema: okSchema,
    handler: async () => {
      await endAllLiveActivities()
      await clearAllWidgets()
      await clearWidgetServerUpdate()
      startedActivities.clear()
      eventLog = []
      return OK
    },
  })

  return null
}
