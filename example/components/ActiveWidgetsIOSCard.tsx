import React, { useCallback, useEffect, useState } from 'react'
import { ActivityIndicator, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native'
import { getActiveWidgets, WidgetInfo } from 'voltra/client'

import { Card } from './Card'

export function ActiveWidgetsIOSCard() {
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
        <Card.Title>Active Home Widgets</Card.Title>
        <TouchableOpacity onPress={refreshWidgets} disabled={loading} style={styles.refreshButton}>
          {loading ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <Text style={styles.refreshText}>Refresh</Text>
          )}
        </TouchableOpacity>
      </View>

      <Card.Text>Active Home Screen widget configurations for this app.</Card.Text>

      {widgets.length > 0 ? (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.scroll}>
          {widgets.map((widget, index) => (
            <View key={`${widget.kind}-${index}`} style={styles.widgetItem}>
              <Text style={styles.widgetName}>{widget.name}</Text>
              <Text style={styles.widgetFamily}>{widget.family}</Text>
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
    backgroundColor: 'rgba(130, 50, 255, 0.1)',
    borderRadius: 12,
    padding: 12,
    marginRight: 12,
    width: 140,
    borderWidth: 1,
    borderColor: 'rgba(130, 50, 255, 0.2)',
  },
  widgetName: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 16,
    marginBottom: 4,
  },
  widgetFamily: {
    color: '#CBD5F5',
    fontSize: 11,
    fontWeight: '600',
  },
  kind: {
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
