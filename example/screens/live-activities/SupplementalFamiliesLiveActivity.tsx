import React, { forwardRef, useEffect, useImperativeHandle } from 'react'
import { useLiveActivity } from 'voltra/client'

import {
  SupplementalFamiliesCompactLeading,
  SupplementalFamiliesCompactTrailing,
  SupplementalFamiliesLockScreen,
  SupplementalFamiliesMinimal,
  SupplementalFamiliesSmall,
} from '../../components/live-activities/SupplementalFamiliesUI'
import { LiveActivityExampleComponent } from './types'

const SupplementalFamiliesLiveActivity: LiveActivityExampleComponent = forwardRef(
  ({ autoUpdate = true, autoStart = false, onIsActiveChange }, ref) => {
    const { start, update, end, isActive } = useLiveActivity(
      {
        lockScreen: {
          content: <SupplementalFamiliesLockScreen />,
        },
        supplementalActivityFamilies: {
          small: <SupplementalFamiliesSmall />,
        },
        island: {
          keylineTint: '#10B981',
          compact: {
            leading: <SupplementalFamiliesCompactLeading />,
            trailing: <SupplementalFamiliesCompactTrailing />,
          },
          minimal: <SupplementalFamiliesMinimal />,
        },
      },
      {
        activityName: 'supplemental-families-demo',
        autoUpdate,
        autoStart,
        deepLinkUrl: '/voltraui/supplemental-families-demo',
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

SupplementalFamiliesLiveActivity.displayName = 'SupplementalFamiliesLiveActivity'

export default SupplementalFamiliesLiveActivity
