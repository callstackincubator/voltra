import React, { useEffect, useState } from 'react'
import { StyleSheet, Text, View } from 'react-native'
import { startAndroidOngoingNotification, stopAndroidOngoingNotification } from '@use-voltra/android-client'

import { Button } from '~/components/Button'
import { Card } from '~/components/Card'
import {
  EVENT_DEMO_NOTIFICATION_ID,
  getEventLog,
  renderEventDemoNotification,
  subscribeToEventLog,
} from '~/notifications/voltraNotificationEvents'

const MAX_SHOWN_EVENTS = 8

const describe = (event: ReturnType<typeof getEventLog>[number]) => {
  const time = new Date(event.timestamp).toLocaleTimeString()
  if (event.type !== 'interaction') return `${time} ${event.type} ${event.notificationId}`
  const reply = event.reply ? ` reply "${event.reply.text}" (${event.reply.source})` : ''
  return `${time} interaction ${event.identifier} rev ${event.revision}${reply}`
}

/**
 * Starts a notification whose actions send events instead of opening the app, and shows every
 * `interaction`, `notificationDismissed` and `notificationTapped` event this runtime received.
 */
export function AndroidOngoingNotificationEventsCard({ channelId }: { channelId: string }) {
  const [events, setEvents] = useState(getEventLog)
  const [lastResult, setLastResult] = useState('none')

  useEffect(() => subscribeToEventLog(setEvents), [])

  const start = async () => {
    try {
      const result = await startAndroidOngoingNotification(renderEventDemoNotification({ paused: false }), {
        notificationId: EVENT_DEMO_NOTIFICATION_ID,
        channelId,
      })
      setLastResult(result.ok ? `start: ok (${result.action})` : `start: not ok (${result.reason})`)
    } catch (error) {
      setLastResult(`start: ${error instanceof Error ? error.message : String(error)}`)
    }
  }

  const stop = async () => {
    const result = await stopAndroidOngoingNotification(EVENT_DEMO_NOTIFICATION_ID)
    setLastResult(result.ok ? 'stop: ok' : `stop: not ok (${result.reason})`)
  }

  return (
    <Card>
      <Card.Title>Event Actions</Card.Title>
      <Card.Text>
        Pause/Resume and End send an event without opening the app, Add tip is a direct reply, and the handler updates
        the notification. Swipe it away or tap it to see the other events.
      </Card.Text>
      <View style={styles.buttonRow}>
        <Button testID="events-start" title="Start Event Demo" onPress={start} />
        <Button testID="events-stop" title="Stop Event Demo" variant="ghost" onPress={stop} />
      </View>
      <Text testID="events-last-result" style={styles.value}>{`Last result: ${lastResult}`}</Text>
      <Text style={styles.label}>Received events</Text>
      {events.length === 0 ? (
        <Text testID="events-empty" style={styles.value}>
          None yet
        </Text>
      ) : (
        events.slice(0, MAX_SHOWN_EVENTS).map((event, index) => (
          <Text key={`${event.timestamp}-${events.length - index}`} testID={`event-${index}`} style={styles.value}>
            {describe(event)}
          </Text>
        ))
      )}
    </Card>
  )
}

const styles = StyleSheet.create({
  label: {
    color: '#94A3B8',
    fontSize: 13,
    marginTop: 12,
  },
  value: {
    color: '#E2E8F0',
    fontSize: 14,
    marginTop: 6,
  },
  buttonRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 12,
  },
})
