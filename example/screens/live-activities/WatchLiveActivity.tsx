import React, { forwardRef, useEffect, useImperativeHandle } from 'react'
import { useLiveActivity } from 'voltra/client'

import {
  WatchLiveActivityLockScreen,
  WatchLiveActivitySmall,
} from '../../components/live-activities/WatchLiveActivityUI'
import { LiveActivityExampleComponent } from './types'

const WatchLiveActivity: LiveActivityExampleComponent = forwardRef(
  ({ autoUpdate = true, autoStart = false, onIsActiveChange }, ref) => {
    const { start, update, end, isActive } = useLiveActivity(
      {
        lockScreen: {
          content: <WatchLiveActivityLockScreen />,
        },
        supplementalActivityFamilies: {
          small: <WatchLiveActivitySmall />,
        },
        island: {
          keylineTint: '#10B981',
        },
      },
      {
        activityName: 'watch-demo',
        autoUpdate,
        autoStart,
        deepLinkUrl: '/voltraui/watch-demo',
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

WatchLiveActivity.displayName = 'WatchLiveActivity'

export default WatchLiveActivity
