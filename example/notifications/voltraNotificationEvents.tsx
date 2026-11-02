import { Platform } from 'react-native'
import { AndroidOngoingNotification } from '@use-voltra/android'
import {
  addVoltraListener,
  updateAndroidOngoingNotification,
  type VoltraInteractionEvent,
  type VoltraNotificationDismissedEvent,
  type VoltraNotificationTappedEvent,
} from '@use-voltra/android-client'

export const EVENT_DEMO_NOTIFICATION_ID = 'event-actions-demo'

type LoggedEvent = VoltraInteractionEvent | VoltraNotificationDismissedEvent | VoltraNotificationTappedEvent

const eventLog: LoggedEvent[] = []
const logListeners = new Set<(events: LoggedEvent[]) => void>()

/** The events received in this JavaScript runtime, newest first. */
export const getEventLog = (): LoggedEvent[] => eventLog

export const subscribeToEventLog = (listener: (events: LoggedEvent[]) => void) => {
  logListeners.add(listener)
  return () => {
    logListeners.delete(listener)
  }
}

const record = (event: LoggedEvent) => {
  // Shows up in logcat for a press handled headlessly, with no screen to show it on.
  console.log(`[voltra-events] ${event.type} ${JSON.stringify(event)}`)
  eventLog.unshift(event)
  logListeners.forEach((listener) => listener([...eventLog]))
}

/** The demo notification: a paused or running workout with an event, a reply, and a deep link action. */
export const renderEventDemoNotification = ({ paused, status }: { paused: boolean; status?: string }) => (
  <AndroidOngoingNotification.Progress
    title={paused ? 'Workout paused' : 'Workout'}
    text={status ?? (paused ? 'Tap Resume to continue' : 'Set 2 of 4')}
    value={18}
    max={45}
  >
    <AndroidOngoingNotification.Action
      title={paused ? 'Resume' : 'Pause'}
      actionId={paused ? 'resume' : 'pause'}
      payload="workout-1"
      semanticAction="none"
    />
    <AndroidOngoingNotification.Action
      title="Add tip"
      actionId="tip"
      remoteInput={{ key: 'tip', label: 'Tip amount', choices: ['10%', '15%', '20%'] }}
    />
    <AndroidOngoingNotification.Action
      title="End workout"
      actionId="end"
      authenticationRequired
      semanticAction="delete"
    />
  </AndroidOngoingNotification.Progress>
)

const handleInteraction = async (event: VoltraInteractionEvent) => {
  record(event)
  if (event.notificationId !== EVENT_DEMO_NOTIFICATION_ID) return

  if (event.identifier === 'pause' || event.identifier === 'resume') {
    await updateAndroidOngoingNotification(
      EVENT_DEMO_NOTIFICATION_ID,
      renderEventDemoNotification({ paused: event.identifier === 'pause' })
    )
  } else if (event.identifier === 'tip' && event.reply) {
    await updateAndroidOngoingNotification(
      EVENT_DEMO_NOTIFICATION_ID,
      renderEventDemoNotification({ paused: false, status: `Tip added: ${event.reply.text}` })
    )
  } else if (event.identifier === 'end') {
    await updateAndroidOngoingNotification(
      EVENT_DEMO_NOTIFICATION_ID,
      renderEventDemoNotification({ paused: true, status: 'Workout ended' })
    )
  }
}

/**
 * Registered from `index.js` at module scope, so a press made while the app is not running is
 * handled in the headless task Voltra starts, without opening the app. The task waits for the
 * promise `handleInteraction` returns, so its notification update finishes first.
 */
export const registerVoltraNotificationEvents = () => {
  if (Platform.OS !== 'android') return
  addVoltraListener('interaction', handleInteraction)
  addVoltraListener('notificationDismissed', record)
  addVoltraListener('notificationTapped', record)
}
