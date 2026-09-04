import * as fs from 'fs'
import * as os from 'os'
import * as path from 'path'

import type { DetectedAndroidWidget } from '../clientRendered'
import { generateWidgetReceivers } from './kotlin'

function makeTempPlatformRoot(): { platformProjectRoot: string; cleanup: () => void } {
  const platformProjectRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'voltra-android-kotlin-'))

  return {
    platformProjectRoot,
    cleanup: () => fs.rmSync(platformProjectRoot, { recursive: true, force: true }),
  }
}

function baseWidget(id: string): Omit<DetectedAndroidWidget, 'clientRendered'> {
  return {
    id,
    displayName: `Widget ${id}`,
    description: `Widget ${id} description`,
    targetCellWidth: 2,
    targetCellHeight: 2,
  }
}

async function generateReceiverFile(
  platformProjectRoot: string,
  packageName: string,
  widget: DetectedAndroidWidget
): Promise<string> {
  await generateWidgetReceivers({ platformProjectRoot, packageName, widgets: [widget] })

  const packagePath = packageName.replace(/\./g, '/')
  const filePath = path.join(
    platformProjectRoot,
    'app',
    'src',
    'main',
    'java',
    packagePath,
    'widget',
    `VoltraWidget_${widget.id}Receiver.kt`
  )

  return fs.readFileSync(filePath, 'utf8')
}

describe('generateWidgetReceivers', () => {
  it('generates a Dynamic Widget receiver extending voltra.dynamicwidget.VoltraClientWidgetReceiver', async () => {
    const { platformProjectRoot, cleanup } = makeTempPlatformRoot()

    try {
      const widget: DetectedAndroidWidget = {
        ...baseWidget('dynamic'),
        clientRendered: true,
        clientSourcePath: '/tmp/does-not-matter.js',
        entry: 'widgets/dynamic.tsx',
      }

      const content = await generateReceiverFile(platformProjectRoot, 'com.example.app', widget)

      expect(content).toBe(
        [
          'package com.example.app.widget',
          '',
          'import voltra.dynamicwidget.VoltraClientWidgetReceiver',
          '',
          '/**',
          ' * Auto-generated Dynamic Widget receiver for Widget dynamic',
          ' * Widget ID: dynamic',
          ' */',
          'class VoltraWidget_dynamicReceiver : VoltraClientWidgetReceiver() {',
          '    override val widgetId: String = "dynamic"',
          '}',
        ].join('\n')
      )
    } finally {
      cleanup()
    }
  })

  it('generates a serverUpdate receiver extending voltra.widget.payload.VoltraPayloadWidgetReceiver', async () => {
    const { platformProjectRoot, cleanup } = makeTempPlatformRoot()

    try {
      const widget: DetectedAndroidWidget = {
        ...baseWidget('server'),
        clientRendered: false,
        serverUpdate: {
          url: 'https://example.com/widget',
          intervalMinutes: 30,
          refresh: true,
        },
      }

      const content = await generateReceiverFile(platformProjectRoot, 'com.example.app', widget)

      expect(content).toBe(
        [
          'package com.example.app.widget',
          '',
          'import android.appwidget.AppWidgetManager',
          'import android.content.Context',
          'import voltra.widget.payload.VoltraPayloadWidgetReceiver',
          'import voltra.widget.payload.VoltraWidgetUpdateScheduler',
          '',
          '/**',
          ' * Auto-generated widget receiver for Widget server',
          ' * Widget ID: server',
          ' * Server Update: https://example.com/widget (every 30 minutes)',
          ' * Refresh Button: true',
          ' */',
          'class VoltraWidget_serverReceiver : VoltraPayloadWidgetReceiver() {',
          '    override val widgetId: String = "server"',
          '',
          '    override fun onUpdate(context: Context, appWidgetManager: AppWidgetManager, appWidgetIds: IntArray) {',
          '        super.onUpdate(context, appWidgetManager, appWidgetIds)',
          '',
          '        // Schedule periodic server updates via WorkManager',
          '        VoltraWidgetUpdateScheduler.schedulePeriodicUpdate(',
          '            context = context,',
          '            widgetId = "server",',
          '            serverUrl = "https://example.com/widget",',
          '            intervalMinutes = 30L,',
          '            refreshEnabled = true',
          '        )',
          '    }',
          '',
          '    override fun onDeleted(context: Context, appWidgetIds: IntArray) {',
          '        super.onDeleted(context, appWidgetIds)',
          '',
          '        // Cancel periodic updates when all instances of this widget are removed',
          '        val remaining = appWidgetManager(context, appWidgetIds)',
          '        if (remaining == 0) {',
          '            VoltraWidgetUpdateScheduler.cancelPeriodicUpdate(context, "server")',
          '        }',
          '    }',
          '',
          '    private fun appWidgetManager(context: Context, deletedIds: IntArray): Int {',
          '        val manager = AppWidgetManager.getInstance(context)',
          '        val componentName = android.content.ComponentName(context, this::class.java)',
          '        val allIds = manager.getAppWidgetIds(componentName)',
          '        return allIds.count { it !in deletedIds }',
          '    }',
          '}',
        ].join('\n')
      )
    } finally {
      cleanup()
    }
  })

  it('generates a plain receiver extending voltra.widget.payload.VoltraPayloadWidgetReceiver', async () => {
    const { platformProjectRoot, cleanup } = makeTempPlatformRoot()

    try {
      const widget: DetectedAndroidWidget = {
        ...baseWidget('legacy'),
        clientRendered: false,
      }

      const content = await generateReceiverFile(platformProjectRoot, 'com.example.app', widget)

      expect(content).toBe(
        [
          'package com.example.app.widget',
          '',
          'import voltra.widget.payload.VoltraPayloadWidgetReceiver',
          '',
          '/**',
          ' * Auto-generated widget receiver for Widget legacy',
          ' * Widget ID: legacy',
          ' */',
          'class VoltraWidget_legacyReceiver : VoltraPayloadWidgetReceiver() {',
          '    override val widgetId: String = "legacy"',
          '}',
        ].join('\n')
      )
    } finally {
      cleanup()
    }
  })
})
