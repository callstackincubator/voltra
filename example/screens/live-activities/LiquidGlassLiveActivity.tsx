import React, { forwardRef, useEffect, useImperativeHandle } from 'react'
import { useLiveActivity, Voltra } from 'voltra'

import {
  LiquidGlassLiveActivityUI,
  VoltraLovesLiveActivity,
} from '../../components/live-activities/LiquidGlassLiveActivityUI'
import { LiveActivityExampleComponent } from './types'

const LiquidGlassLiveActivity: LiveActivityExampleComponent = forwardRef(
  ({ autoUpdate = true, autoStart = false, onIsActiveChange }, ref) => {
    const { start, update, end, isActive } = useLiveActivity(
      {
        island: {
          compact: {
            leading: <Voltra.Symbol name="heart.fill" tintColor="#FF0000" size={28} />,
            trailing: <Voltra.Symbol name="heart.fill" tintColor="#FFFF00" size={28} />,
          },
          expanded: {
            center: <VoltraLovesLiveActivity />,
          },
        },
        lockScreen: {
          content: <LiquidGlassLiveActivityUI />,
          activityBackgroundTint: 'clear',
        },
      },
      {
        activityName: 'liquid-glass',
        autoUpdate,
        autoStart,
        deepLinkUrl: '/voltraui/glass',
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

LiquidGlassLiveActivity.displayName = 'LiquidGlassLiveActivity'

export default LiquidGlassLiveActivity
