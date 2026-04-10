import * as Notifications from 'expo-notifications'
import * as TaskManager from 'expo-task-manager'

import {
  handleBackgroundNotificationTask,
  VOLTRA_BACKGROUND_NOTIFICATION_TASK,
} from './voltraAndroidOngoingNotificationBackground'

if (!TaskManager.isTaskDefined(VOLTRA_BACKGROUND_NOTIFICATION_TASK)) {
  TaskManager.defineTask<Notifications.NotificationTaskPayload>(
    VOLTRA_BACKGROUND_NOTIFICATION_TASK,
    async ({ data, error, executionInfo }) => {
      if (error) {
        console.log('[voltra-background-task] Task invocation error:', error)
        return
      }

      console.log('[voltra-background-task] Task invoked:', executionInfo?.eventId ?? 'unknown-event')

      await handleBackgroundNotificationTask({ data })
    }
  )
}

let backgroundTaskRegistration: Promise<null> | null = null

export const registerVoltraBackgroundNotifications = async () => {
  if (!backgroundTaskRegistration) {
    backgroundTaskRegistration = Notifications.registerTaskAsync(VOLTRA_BACKGROUND_NOTIFICATION_TASK)
  }

  await backgroundTaskRegistration
  console.log('[voltra-background-task] Background notification task registered:', VOLTRA_BACKGROUND_NOTIFICATION_TASK)
}
