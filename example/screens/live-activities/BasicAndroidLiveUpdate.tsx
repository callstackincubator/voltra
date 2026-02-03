import React, { forwardRef, useEffect, useImperativeHandle, useMemo, useState } from 'react'
import { VoltraAndroid } from 'voltra/android'
import { useAndroidLiveUpdate } from 'voltra/android/client'

import { LiveActivityExampleComponent } from './types'

const BasicAndroidLiveUpdate: LiveActivityExampleComponent = forwardRef(
  ({ autoUpdate = true, autoStart = false, onIsActiveChange }, ref) => {
    const [elapsedSeconds, setElapsedSeconds] = useState(0)

    const formatTime = useMemo(() => {
      const mins = Math.floor(elapsedSeconds / 60)
      const secs = elapsedSeconds % 60
      return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
    }, [elapsedSeconds])

    const progress = useMemo(() => (elapsedSeconds % 60) / 60, [elapsedSeconds])

    const variants = useMemo(
      () => ({
        collapsed: (
          <VoltraAndroid.Row style={{ padding: 12 }}>
            <VoltraAndroid.Column style={{ paddingRight: 12 }}>
              <VoltraAndroid.CircularProgressIndicator />
            </VoltraAndroid.Column>
            <VoltraAndroid.Column>
              <VoltraAndroid.Text style={{ fontSize: 16, fontWeight: 'bold' }}>Voltra Live Update</VoltraAndroid.Text>
              <VoltraAndroid.Text style={{ fontSize: 12 }}>Running: {formatTime}</VoltraAndroid.Text>
            </VoltraAndroid.Column>
          </VoltraAndroid.Row>
        ),
        expanded: (
          <VoltraAndroid.Column
            style={{ padding: 16, backgroundColor: '#000000', borderRadius: 16, fillMaxWidth: true } as any}
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

            <VoltraAndroid.LinearProgressIndicator style={{ fillMaxWidth: true } as any} progress={progress} />

            <VoltraAndroid.Row style={{ paddingTop: 12 }}>
              <VoltraAndroid.Text style={{ fontSize: 12, color: '#FFFFFF' }}>
                Updated at {new Date().toLocaleTimeString()}
              </VoltraAndroid.Text>
            </VoltraAndroid.Row>
          </VoltraAndroid.Column>
        ),
      }),
      [formatTime, progress]
    )

    const { start, update, end, isActive } = useAndroidLiveUpdate(variants, {
      updateName: 'basic-android-demo',
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

BasicAndroidLiveUpdate.displayName = 'BasicAndroidLiveUpdate'

export default BasicAndroidLiveUpdate
