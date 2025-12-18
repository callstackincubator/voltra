import React, { forwardRef, useEffect, useImperativeHandle } from 'react'
import { useVoltra } from 'voltra'

import { LiveActivityExampleComponent } from './types'
import {
  FlightLiveActivityLockScreen,
  FlightLiveActivityIslandMinimal,
  FlightLiveActivityIslandCompactLeading,
  FlightLiveActivityIslandCompactTrailing,
  FlightLiveActivityIslandExpandedLeading,
  FlightLiveActivityIslandExpandedTrailing,
  FlightLiveActivityIslandExpandedBottom,
} from '../../components/live-activities/FlightLiveActivityUI'

const FlightLiveActivity: LiveActivityExampleComponent = forwardRef(
  ({ autoUpdate = true, autoStart = false, onIsActiveChange }, ref) => {
    const { start, update, end, isActive } = useVoltra(
      {
        lockScreen: <FlightLiveActivityLockScreen />,
        island: {
          keylineTint: 'yellow',
          minimal: <FlightLiveActivityIslandMinimal />,
          compact: {
            leading: <FlightLiveActivityIslandCompactLeading />,
            trailing: <FlightLiveActivityIslandCompactTrailing />,
          },
          expanded: {
            leading: <FlightLiveActivityIslandExpandedLeading />,
            trailing: <FlightLiveActivityIslandExpandedTrailing />,
            bottom: <FlightLiveActivityIslandExpandedBottom />,
          },
        },
      },
      {
        activityName: 'flight',
        autoUpdate,
        autoStart,
        deepLinkUrl: '/voltraui/flight',
      }
    )

    useEffect(() => {
      onIsActiveChange?.(isActive)
    }, [isActive, onIsActiveChange])

    useImperativeHandle(ref, () => ({
      start,
      update,
      end,
    }))

    return null
  }
)

FlightLiveActivity.displayName = 'FlightLiveActivity'

export default FlightLiveActivity
