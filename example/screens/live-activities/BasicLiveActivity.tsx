import React, { forwardRef, useEffect, useImperativeHandle } from 'react'
import { useLiveActivity } from 'voltra'

import { BasicLiveActivityUI } from '../../components/live-activities/BasicLiveActivityUI'
import { LiveActivityExampleComponent } from './types'

const BasicLiveActivity: LiveActivityExampleComponent = forwardRef(
  ({ autoUpdate = true, autoStart = false, onIsActiveChange }, ref) => {
    const { start, update, end, isActive } = useLiveActivity(
      {
        lockScreen: {
          content: <BasicLiveActivityUI />,
        },
        island: {
          keylineTint: 'green',
        },
      },
      {
        activityName: 'basic',
        autoUpdate,
        autoStart,
        deepLinkUrl: '/voltraui/basic',
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

BasicLiveActivity.displayName = 'BasicLiveActivity'

export default BasicLiveActivity
