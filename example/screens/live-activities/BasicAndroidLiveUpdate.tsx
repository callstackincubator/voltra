/* eslint-disable simple-import-sort/imports */
import React, { forwardRef, useEffect, useImperativeHandle, useState } from 'react'
import { VoltraAndroid } from 'voltra/android'
import {
  unstable_startAndroidLiveUpdate,
  unstable_updateAndroidLiveUpdate,
  unstable_stopAndroidLiveUpdate,
  unstable_isAndroidLiveUpdateActive,
} from 'voltra/android/client'

import { LiveActivityExampleComponent } from './types'

const BasicAndroidLiveUpdate: LiveActivityExampleComponent = forwardRef(
  ({ autoUpdate = true, autoStart = false, onIsActiveChange }, ref) => {
    const [isActive, setIsActive] = useState(false)
    const [notificationId, setNotificationId] = useState<string | null>(null)
    const [elapsedSeconds, setElapsedSeconds] = useState(0)

    const formatTime = (seconds: number) => {
      const mins = Math.floor(seconds / 60)
      const secs = seconds % 60
      return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
    }

    const getProgress = (seconds?: number) => ((seconds ?? elapsedSeconds) % 60) / 60

    const start = async () => {
      console.log('[AndroidLiveUpdate] Starting...')
      try {
        const id = await unstable_startAndroidLiveUpdate(
          {
            collapsed: (
              <VoltraAndroid.Row style={{ padding: 12 }}>
                <VoltraAndroid.Column style={{ paddingRight: 12 }}>
                  <VoltraAndroid.CircularProgressIndicator />
                </VoltraAndroid.Column>
                <VoltraAndroid.Column>
                  <VoltraAndroid.Text style={{ fontSize: 16, fontWeight: 'bold' }}>
                    Voltra Live Update
                  </VoltraAndroid.Text>
                  <VoltraAndroid.Text style={{ fontSize: 12 }}>Running: {formatTime(0)}</VoltraAndroid.Text>
                </VoltraAndroid.Column>
              </VoltraAndroid.Row>
            ),
            expanded: (
              <VoltraAndroid.Column style={{ padding: 16 }}>
                <VoltraAndroid.Row style={{ paddingBottom: 12 }}>
                  <VoltraAndroid.Text style={{ fontSize: 20, fontWeight: 'bold' }}>
                    Voltra Live Update Demo
                  </VoltraAndroid.Text>
                </VoltraAndroid.Row>

                <VoltraAndroid.Row style={{ paddingBottom: 8 }}>
                  <VoltraAndroid.Text style={{ fontSize: 14 }}>Elapsed Time:</VoltraAndroid.Text>
                  <VoltraAndroid.Spacer />
                  <VoltraAndroid.Text style={{ fontSize: 18, fontWeight: 'bold' }}>{formatTime(0)}</VoltraAndroid.Text>
                </VoltraAndroid.Row>

                <VoltraAndroid.LinearProgressIndicator progress={getProgress()} />

                <VoltraAndroid.Row style={{ paddingTop: 12 }}>
                  <VoltraAndroid.Text style={{ fontSize: 12 }}>
                    Powered by Jetpack Glance + React Native
                  </VoltraAndroid.Text>
                </VoltraAndroid.Row>
              </VoltraAndroid.Column>
            ),
          },
          {
            updateName: 'basic-android-demo',
          }
        )

        console.log('[AndroidLiveUpdate] Started with ID:', id)
        setNotificationId(id)
        setIsActive(true)
        setElapsedSeconds(0)
      } catch (error) {
        console.error('[AndroidLiveUpdate] Failed to start:', error)
      }
    }

    const update = async () => {
      if (!notificationId) return

      const newElapsed = elapsedSeconds + 1
      console.log('[AndroidLiveUpdate] Updating, elapsed:', newElapsed)

      try {
        setElapsedSeconds(newElapsed)
        await unstable_updateAndroidLiveUpdate(notificationId, {
          collapsed: (
            <VoltraAndroid.Row style={{ padding: 12 }}>
              <VoltraAndroid.Column style={{ paddingRight: 12 }}>
                <VoltraAndroid.CircularProgressIndicator />
              </VoltraAndroid.Column>
              <VoltraAndroid.Column>
                <VoltraAndroid.Text style={{ fontSize: 16, fontWeight: 'bold' }}>Voltra Live Update</VoltraAndroid.Text>
                <VoltraAndroid.Text style={{ fontSize: 12 }}>Running: {formatTime(newElapsed)}</VoltraAndroid.Text>
              </VoltraAndroid.Column>
            </VoltraAndroid.Row>
          ),
          expanded: (
            <VoltraAndroid.Column
              style={{ padding: 16, backgroundColor: '#000000', borderRadius: 16, fillMaxWidth: true }}
            >
              <VoltraAndroid.Row style={{ paddingBottom: 12 }}>
                <VoltraAndroid.Text style={{ fontSize: 20, fontWeight: 'bold', color: '#FFFFFF' }}>
                  Hello, Voltra!
                </VoltraAndroid.Text>
              </VoltraAndroid.Row>

              <VoltraAndroid.Row style={{ paddingBottom: 8 }}>
                <VoltraAndroid.Text style={{ fontSize: 14, color: '#FFFFFF' }}>
                  No animations, but it works!
                </VoltraAndroid.Text>
              </VoltraAndroid.Row>

              <VoltraAndroid.LinearProgressIndicator
                style={{ fillMaxWidth: true }}
                progress={getProgress(newElapsed)}
              />

              <VoltraAndroid.Row style={{ paddingTop: 12 }}>
                <VoltraAndroid.Text style={{ fontSize: 12, color: '#FFFFFF' }}>
                  Updated at {new Date().toLocaleTimeString()}
                </VoltraAndroid.Text>
              </VoltraAndroid.Row>
            </VoltraAndroid.Column>
          ),
        })
      } catch (error) {
        console.error('[AndroidLiveUpdate] Failed to update:', error)
      }
    }

    const end = async () => {
      if (!notificationId) return
      console.log('[AndroidLiveUpdate] Stopping...')

      try {
        await unstable_stopAndroidLiveUpdate(notificationId)
        setNotificationId(null)
        setIsActive(false)
        setElapsedSeconds(0)
        console.log('[AndroidLiveUpdate] Stopped')
      } catch (error) {
        console.error('[AndroidLiveUpdate] Failed to stop:', error)
      }
    }

    const checkActive = () => {
      const active = unstable_isAndroidLiveUpdateActive('basic-android-demo')
      setIsActive(active)
      return active
    }

    useEffect(() => {
      onIsActiveChange?.(isActive)
    }, [isActive, onIsActiveChange])

    useEffect(() => {
      if (autoStart) {
        start()
      }
    }, [autoStart])

    useEffect(() => {
      if (autoUpdate && isActive && notificationId) {
        const interval = setInterval(update, 1000)
        return () => clearInterval(interval)
      }
    }, [autoUpdate, isActive, notificationId, elapsedSeconds])

    useImperativeHandle(ref, () => ({
      start,
      update,
      end,
      isActive,
      checkActive,
    }))

    return null
  }
)

BasicAndroidLiveUpdate.displayName = 'BasicAndroidLiveUpdate'

export default BasicAndroidLiveUpdate
