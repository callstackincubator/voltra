import React, { forwardRef, useEffect, useImperativeHandle, useMemo, useState } from 'react'
import { useVoltra } from 'voltra'

import { WorkoutLiveActivityUI } from '../../components/live-activities/WorkoutLiveActivityUI'
import { LiveActivityExampleComponent } from './types'

const WorkoutLiveActivity: LiveActivityExampleComponent = forwardRef(
  ({ autoUpdate = true, autoStart = false, onIsActiveChange }, ref) => {
    const [elapsedSeconds, setElapsedSeconds] = useState(0)
    const [heartRate, setHeartRate] = useState(120)
    const [distance, setDistance] = useState(0)
    const [startTime] = useState(() => Date.now())

    // Format distance as X.X km
    const distanceText = useMemo(() => {
      return `${(distance / 1000).toFixed(1)} km`
    }, [distance])

    // Calculate pace (min/km) based on distance and time
    const pace = useMemo(() => {
      if (distance === 0 || elapsedSeconds === 0) return '--:--'
      const paceSeconds = elapsedSeconds / (distance / 1000)
      const paceMinutes = Math.floor(paceSeconds / 60)
      const paceRemainingSeconds = Math.floor(paceSeconds % 60)
      return `${paceMinutes}:${paceRemainingSeconds.toString().padStart(2, '0')}`
    }, [distance, elapsedSeconds])

    const variants = useMemo(
      () => ({
        lockScreen: (
          <WorkoutLiveActivityUI heartRate={heartRate} distance={distanceText} pace={pace} startTime={startTime} />
        ),
      }),
      [heartRate, distanceText, pace, startTime]
    )

    const { start, update, end, isActive } = useVoltra(variants, {
      activityName: 'workout',
      autoUpdate,
      autoStart,
    })

    useEffect(() => {
      onIsActiveChange?.(isActive)
    }, [isActive, onIsActiveChange])

    useEffect(() => {
      if (!isActive) return

      const interval = setInterval(() => {
        setElapsedSeconds((prev) => prev + 1)
        setHeartRate((prev) => {
          // Simulate heart rate fluctuations
          const change = Math.random() * 6 - 3 // -3 to +3 BPM
          const newRate = Math.max(80, Math.min(180, prev + change))
          return Math.round(newRate)
        })
        setDistance((prev) => prev + 5) // Add ~5 meters per second (roughly jogging pace)
      }, 1000)

      return () => clearInterval(interval)
    }, [isActive])

    useImperativeHandle(ref, () => ({
      start,
      update,
      end,
    }))

    return null
  }
)

WorkoutLiveActivity.displayName = 'WorkoutLiveActivity'

export default WorkoutLiveActivity
