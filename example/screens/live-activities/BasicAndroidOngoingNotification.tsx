import React, { forwardRef, useEffect, useImperativeHandle, useMemo, useState } from 'react'
import { AndroidOngoingNotification } from 'voltra/android'
import { useAndroidOngoingNotification } from 'voltra/android/client'

import { LiveActivityExampleComponent } from './types'

const BasicAndroidOngoingNotification: LiveActivityExampleComponent = forwardRef(
  ({ autoUpdate = true, autoStart = false, onIsActiveChange }, ref) => {
    const [elapsedSeconds, setElapsedSeconds] = useState(0)

    const formatTime = useMemo(() => {
      const mins = Math.floor(elapsedSeconds / 60)
      const secs = elapsedSeconds % 60
      return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
    }, [elapsedSeconds])

    const progress = useMemo(() => (elapsedSeconds % 60) / 60, [elapsedSeconds])

    const variants = useMemo(
      () => (
        <AndroidOngoingNotification.Progress
          title="Voltra Ongoing Notification"
          text={`Running: ${formatTime} • Updated at ${new Date().toLocaleTimeString()}`}
          value={Math.round(progress * 60)}
          max={60}
          shortCriticalText={formatTime}
          chronometer
          when={Date.now() - elapsedSeconds * 1000}
        />
      ),
      [elapsedSeconds, formatTime, progress]
    )

    const { start, update, end, isActive } = useAndroidOngoingNotification(variants, {
      notificationId: 'basic-android-demo',
      channelId: 'voltra_live_updates',
      autoUpdate,
      autoStart,
    })

    useEffect(() => {
      onIsActiveChange?.(isActive)
    }, [isActive, onIsActiveChange])

    useEffect(() => {
      if (!isActive) {
        setElapsedSeconds(0)
        return
      }

      const interval = setInterval(() => {
        setElapsedSeconds((prev) => prev + 1)
      }, 1000)

      return () => clearInterval(interval)
    }, [isActive])

    useImperativeHandle(ref, () => ({
      start,
      update,
      end,
      isActive,
    }))

    return null
  }
)

BasicAndroidOngoingNotification.displayName = 'BasicAndroidOngoingNotification'

export default BasicAndroidOngoingNotification
