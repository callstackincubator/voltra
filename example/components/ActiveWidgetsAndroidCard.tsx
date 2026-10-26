import React, { useCallback, useEffect, useState } from 'react'
import { ActivityIndicator, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native'
import { addVoltraListener, getActiveWidgets, VoltraEventMap, WidgetInfo } from '@use-voltra/android-client'

import { Card } from './Card'

const LIFECYCLE_EVENTS = [
  'widgetAdded',
  'widgetResized',
  'widgetRemoved',
  'widgetRestored',
  'widgetEnabled',
  'widgetDisabled',
] as const

type LifecycleEvent = VoltraEventMap[(typeof LIFECYCLE_EVENTS)[number]]

type LogEntry = { key: number; event: LifecycleEvent }

const pad = (value: number, length = 2) => String(value).padStart(length, '0')

const formatTime = (timestamp: number) => {
  const date = new Date(timestamp)
  return `${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}.${pad(date.getMilliseconds(), 3)}`
}

const describeLifecycleEvent = (event: LifecycleEvent) => {
  const parts = [formatTime(event.timestamp), event.type, event.widgetType]
  if ('appWidgetId' in event) parts.push(`#${event.appWidgetId}`)
  if ('sizes' in event) parts.push(event.sizes.map((size) => `${size.width}×${size.height}`).join(', '))
  return parts.join(' · ')
}

export function ActiveWidgetsAndroidCard() {
  const [widgets, setWidgets] = useState<WidgetInfo[]>([])
  const [loading, setLoading] = useState(true)
  const [lifecycleLog, setLifecycleLog] = useState<LogEntry[]>([])

  const refreshWidgets = useCallback(async () => {
    setLoading(true)
    try {
      const activeWidgets = await getActiveWidgets()
      setWidgets(activeWidgets)
    } catch (error) {
      console.error('Failed to fetch active widgets:', error)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    refreshWidgets()
  }, [refreshWidgets])

  useEffect(() => {
    let nextKey = 0
    const onEvent = (event: LifecycleEvent) => {
      const key = nextKey++
      setLifecycleLog((log) => [...log, { key, event }])
    }
    const subscriptions = LIFECYCLE_EVENTS.map((type) => addVoltraListener(type, onEvent))
    return () => subscriptions.forEach((subscription) => subscription.remove())
  }, [])

  return (
    <Card>
      <View style={styles.header}>
        <Card.Title>Active Widgets</Card.Title>
        <TouchableOpacity onPress={refreshWidgets} disabled={loading} style={styles.refreshButton}>
          {loading ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <Text style={styles.refreshText}>Refresh</Text>
          )}
        </TouchableOpacity>
      </View>

      <Card.Text>Currently active widget instances on your home screen.</Card.Text>

      {widgets.length > 0 ? (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.scroll}>
          {widgets.map((widget) => (
            <View key={`${widget.widgetId}`} style={styles.widgetItem}>
              <Text style={styles.widgetName}>{widget.name}</Text>
              <Text style={styles.widgetId}>ID: {widget.widgetId}</Text>
              <Text style={styles.widgetDetails}>
                {widget.width}x{widget.height}dp
              </Text>
              <Text style={styles.widgetDetails}>
                {widget.sizes.length > 0
                  ? widget.sizes.map(({ width, height }) => `${width}×${height}`).join(', ')
                  : 'No sizes'}
              </Text>
            </View>
          ))}
        </ScrollView>
      ) : (
        <View style={styles.emptyState}>
          <Text style={styles.emptyText}>{loading ? 'Fetching widgets...' : 'No active widgets found'}</Text>
        </View>
      )}

      <Text style={styles.logTitle}>Lifecycle events</Text>
      <View testID="widget-lifecycle-log">
        {lifecycleLog.length > 0 ? (
          lifecycleLog.map(({ key, event }) => (
            <Text key={key} testID="widget-lifecycle-entry" style={styles.logEntry}>
              {describeLifecycleEvent(event)}
            </Text>
          ))
        ) : (
          <Text style={styles.emptyText}>No lifecycle events yet</Text>
        )}
      </View>
    </Card>
  )
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  refreshButton: {
    paddingVertical: 4,
    paddingHorizontal: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 12,
  },
  refreshText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },
  scroll: {
    marginTop: 12,
  },
  widgetItem: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 12,
    padding: 12,
    marginRight: 12,
    width: 140,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  widgetName: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 16,
    marginBottom: 4,
  },
  widgetId: {
    color: '#CBD5F5',
    fontSize: 11,
  },
  widgetDetails: {
    color: '#CBD5F5',
    fontSize: 11,
    marginTop: 2,
  },
  provider: {
    color: 'rgba(203, 213, 245, 0.5)',
    fontSize: 10,
    marginTop: 8,
  },
  logTitle: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 14,
    marginTop: 16,
    marginBottom: 8,
  },
  logEntry: {
    color: '#CBD5F5',
    fontSize: 11,
    fontVariant: ['tabular-nums'],
    paddingVertical: 4,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  emptyState: {
    padding: 20,
    alignItems: 'center',
  },
  emptyText: {
    color: '#CBD5F5',
    fontStyle: 'italic',
  },
})
