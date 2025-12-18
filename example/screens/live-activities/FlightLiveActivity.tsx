import React, { forwardRef, useEffect, useImperativeHandle } from 'react'
import { useLiveActivity } from 'voltra'

import {
  FlightLiveActivityIslandCompactLeading,
  FlightLiveActivityIslandCompactTrailing,
  FlightLiveActivityIslandExpandedBottom,
  FlightLiveActivityIslandExpandedLeading,
  FlightLiveActivityIslandExpandedTrailing,
  FlightLiveActivityIslandMinimal,
  FlightLiveActivityLockScreen,
} from '../../components/live-activities/FlightLiveActivityUI'
import { LiveActivityExampleComponent } from './types'

const FlightLiveActivity: LiveActivityExampleComponent = forwardRef(
  ({ autoUpdate = true, autoStart = false, onIsActiveChange }, ref) => {
    const { start, update, end, isActive } = useLiveActivity(
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
