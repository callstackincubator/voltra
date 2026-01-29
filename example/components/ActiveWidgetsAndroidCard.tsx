import React, { useCallback, useEffect, useState } from 'react'
import { ActivityIndicator, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native'
import { getActiveWidgets, WidgetInfo } from 'voltra/android/client'

import { Card } from './Card'

export function ActiveWidgetsAndroidCard() {
  const [widgets, setWidgets] = useState<WidgetInfo[]>([])
  const [loading, setLoading] = useState(true)

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
            </View>
          ))}
        </ScrollView>
      ) : (
        <View style={styles.emptyState}>
          <Text style={styles.emptyText}>{loading ? 'Fetching widgets...' : 'No active widgets found'}</Text>
        </View>
      )}
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
  emptyState: {
    padding: 20,
    alignItems: 'center',
  },
  emptyText: {
    color: '#CBD5F5',
    fontStyle: 'italic',
  },
})
