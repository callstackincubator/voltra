import React, { useMemo, useState } from 'react'
import { StyleSheet, Text, View } from 'react-native'
import { AndroidOngoingNotification } from '@use-voltra/android'
import { getAndroidOngoingNotificationStatus, useAndroidOngoingNotification } from '@use-voltra/android-client'

import { Button } from '~/components/Button'
import { Card } from '~/components/Card'

const HOOK_NOTIFICATION_ID = 'hook-demo'
const HOOK_TIMEOUT_MS = 10_000

const formatResult = (result: { ok: boolean; action?: string; reason?: string }) =>
  result.ok ? `ok (${result.action})` : `not ok (${result.reason})`

/**
 * Drives `useAndroidOngoingNotification` directly, so the hook's own `isActive` can be compared with
 * what the device reports after the notification is swiped away, times out, or is stopped elsewhere.
 */
export function AndroidOngoingNotificationHookCard({ channelId }: { channelId: string }) {
  const [count, setCount] = useState(0)
  const [autoStart, setAutoStart] = useState(false)
  const [timeoutEnabled, setTimeoutEnabled] = useState(false)
  const [lastResult, setLastResult] = useState('none')
  const [nativeStatus, setNativeStatus] = useState(() => getAndroidOngoingNotificationStatus(HOOK_NOTIFICATION_ID))

  const content = useMemo(
    () => <AndroidOngoingNotification.Progress title="Hook demo" text={`Count ${count}`} value={count % 10} max={10} />,
    [count]
  )

  const { start, update, end, isActive } = useAndroidOngoingNotification(content, {
    notificationId: HOOK_NOTIFICATION_ID,
    channelId,
    autoStart,
    autoUpdate: true,
    timeoutMs: timeoutEnabled ? HOOK_TIMEOUT_MS : undefined,
  })

  const run = async (label: string, action: () => Promise<{ ok: boolean; action?: string; reason?: string }>) => {
    try {
      setLastResult(`${label}: ${formatResult(await action())}`)
    } catch (error) {
      setLastResult(`${label}: ${error instanceof Error ? error.message : String(error)}`)
    }
    setNativeStatus(getAndroidOngoingNotificationStatus(HOOK_NOTIFICATION_ID))
  }

  return (
    <Card>
      <Card.Title>Hook</Card.Title>
      <Card.Text>{`useAndroidOngoingNotification for "${HOOK_NOTIFICATION_ID}".`}</Card.Text>
      <Text testID="hook-is-active" style={styles.value}>{`Hook isActive: ${isActive ? 'yes' : 'no'}`}</Text>
      <Text testID="hook-native-status" style={styles.value}>
        {`Native status: isActive=${nativeStatus.isActive} isDismissed=${nativeStatus.isDismissed}`}
      </Text>
      <Text testID="hook-last-result" style={styles.value}>{`Last result: ${lastResult}`}</Text>
      <View style={styles.buttonRow}>
        <Button testID="hook-start" title="Hook Start" onPress={() => run('start', () => start())} />
        <Button testID="hook-count" title="Hook Count +1" variant="secondary" onPress={() => setCount((c) => c + 1)} />
        <Button testID="hook-end" title="Hook End" variant="ghost" onPress={() => run('end', end)} />
        <Button
          testID="hook-auto-start"
          title={`Hook autoStart ${autoStart ? 'ON' : 'OFF'}`}
          variant="secondary"
          onPress={() => setAutoStart((current) => !current)}
        />
        <Button
          testID="hook-refresh-native"
          title="Read Native Status"
          variant="secondary"
          onPress={() => setNativeStatus(getAndroidOngoingNotificationStatus(HOOK_NOTIFICATION_ID))}
        />
        <Button
          testID="hook-timeout"
          title={`Hook timeout 10s ${timeoutEnabled ? 'ON' : 'OFF'}`}
          variant="secondary"
          onPress={() => setTimeoutEnabled((current) => !current)}
        />
        <Button
          testID="hook-update"
          title="Hook Update"
          variant="secondary"
          onPress={() => run('update', () => update())}
        />
      </View>
    </Card>
  )
}

const styles = StyleSheet.create({
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
