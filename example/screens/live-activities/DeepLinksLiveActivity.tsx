import React, { forwardRef, useEffect, useImperativeHandle } from 'react'
import { useLiveActivity } from 'voltra/client'

import { DeepLinksLiveActivityUI } from '../../components/live-activities/DeepLinksLiveActivityUI'
import { LiveActivityExampleComponent } from './types'

const DeepLinksLiveActivity: LiveActivityExampleComponent = forwardRef(
  ({ autoUpdate = true, autoStart = false, onIsActiveChange }, ref) => {
    const { start, update, end, isActive } = useLiveActivity(
      {
        lockScreen: {
          content: <DeepLinksLiveActivityUI />,
        },
        island: {
          keylineTint: '#3B82F6',
        },
      },
      {
        activityName: 'deep-links',
        autoUpdate,
        autoStart,
        deepLinkUrl: '/voltraui/deep-links',
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

DeepLinksLiveActivity.displayName = 'DeepLinksLiveActivity'

export default DeepLinksLiveActivity
