import type { ComponentType } from 'react'

import type {
  AndroidOngoingNotificationActionProps,
  AndroidOngoingNotificationBigTextProps,
  AndroidOngoingNotificationProgressProps,
} from './types.js'

export const ANDROID_ONGOING_NOTIFICATION_COMPONENT_TAG = Symbol.for('VOLTRA_ANDROID_ONGOING_NOTIFICATION_COMPONENT')

type AndroidOngoingNotificationComponentKind = 'progress' | 'bigText' | 'action'

type AndroidOngoingNotificationComponent<TProps extends Record<string, unknown>> = ComponentType<TProps> & {
  displayName: string
  [ANDROID_ONGOING_NOTIFICATION_COMPONENT_TAG]: AndroidOngoingNotificationComponentKind
}

const createAndroidOngoingNotificationComponent = <TProps extends Record<string, unknown>>(
  displayName: string,
  kind: AndroidOngoingNotificationComponentKind
): AndroidOngoingNotificationComponent<TProps> => {
  const Component = (_props: TProps) => null

  Component.displayName = displayName
  ;(Component as AndroidOngoingNotificationComponent<TProps>)[ANDROID_ONGOING_NOTIFICATION_COMPONENT_TAG] = kind

  return Component as AndroidOngoingNotificationComponent<TProps>
}

export const Progress = createAndroidOngoingNotificationComponent<AndroidOngoingNotificationProgressProps>(
  'AndroidOngoingNotification.Progress',
  'progress'
)

export const BigText = createAndroidOngoingNotificationComponent<AndroidOngoingNotificationBigTextProps>(
  'AndroidOngoingNotification.BigText',
  'bigText'
)

export const Action = createAndroidOngoingNotificationComponent<AndroidOngoingNotificationActionProps>(
  'AndroidOngoingNotification.Action',
  'action'
)

export const AndroidOngoingNotification = {
  Progress,
  BigText,
  Action,
} as const
