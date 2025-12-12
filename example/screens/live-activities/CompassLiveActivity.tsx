import { Magnetometer } from 'expo-sensors'
import React, { forwardRef, useCallback, useEffect, useImperativeHandle, useMemo, useState } from 'react'
import { Alert } from 'react-native'
import { useVoltra } from 'voltra'

import {
  CompassLiveActivityIslandCompactLeading,
  CompassLiveActivityIslandCompactTrailing,
  CompassLiveActivityIslandExpandedBottom,
  CompassLiveActivityIslandExpandedLeading,
  CompassLiveActivityIslandExpandedTrailing,
  CompassLiveActivityIslandMinimal,
  CompassLiveActivityLockScreen,
} from '../../components/live-activities/CompassLiveActivityUI'
import { LiveActivityExampleComponent } from './types'

/**
 * Calculate heading from magnetometer data
 * Returns heading in degrees (0-360, where 0 = North)
 */
function calculateHeading(x: number, y: number): number {
  // Calculate angle in radians
  let angle = Math.atan2(y, x)

  // Convert to degrees
  let heading = angle * (180 / Math.PI)

  // Normalize to 0-360 range
  // Adjust so that 0 degrees is North (positive Y axis in device coordinates)
  heading = (heading + 90 + 360) % 360

  return heading
}

const CompassLiveActivity: LiveActivityExampleComponent = forwardRef(
  ({ autoUpdate = true, autoStart = false, onIsActiveChange }, ref) => {
    const [heading, setHeading] = useState(0)
    const [hasPermission, setHasPermission] = useState(false)

    const variants = useMemo(
      () => ({
        lockScreen: <CompassLiveActivityLockScreen heading={heading} />,
        island: {
          keylineTint: 'blue',
          minimal: <CompassLiveActivityIslandMinimal heading={heading} />,
          compact: {
            leading: <CompassLiveActivityIslandCompactLeading heading={heading} />,
            trailing: <CompassLiveActivityIslandCompactTrailing heading={heading} />,
          },
          expanded: {
            leading: <CompassLiveActivityIslandExpandedLeading />,
            trailing: <CompassLiveActivityIslandExpandedTrailing heading={heading} />,
            bottom: <CompassLiveActivityIslandExpandedBottom heading={heading} />,
          },
        },
      }),
      [heading]
    )

    const {
      start: voltraStart,
      update,
      end,
      isActive,
    } = useVoltra(variants, {
      activityId: 'compass',
      autoUpdate,
      autoStart,
    })

    // Request permission and start activity
    const start = useCallback(async () => {
      const { status } = await Magnetometer.requestPermissionsAsync()
      if (status === 'granted') {
        setHasPermission(true)
        await voltraStart()
      } else {
        Alert.alert(
          'Permission Required',
          'Magnetometer permission is required to use the compass. Please enable it in Settings.',
          [{ text: 'OK' }]
        )
      }
    }, [voltraStart])

    useEffect(() => {
      onIsActiveChange?.(isActive)
    }, [isActive, onIsActiveChange])

    // Subscribe to magnetometer when activity is active and has permission
    useEffect(() => {
      if (!isActive || !hasPermission) return

      // Set update interval (in milliseconds)
      Magnetometer.setUpdateInterval(1000)

      const subscription = Magnetometer.addListener((data) => {
        const newHeading = calculateHeading(data.x, data.y)
        setHeading(newHeading)
      })

      return () => {
        subscription.remove()
      }
    }, [isActive, hasPermission])

    useImperativeHandle(ref, () => ({
      start,
      update,
      end,
    }))

    return null
  }
)

CompassLiveActivity.displayName = 'CompassLiveActivity'

export default CompassLiveActivity
