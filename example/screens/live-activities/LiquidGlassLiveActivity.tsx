import React, { forwardRef, useEffect, useImperativeHandle } from 'react'
import { useVoltra, Voltra } from 'voltra'

import { LiveActivityExampleComponent } from './types'
import {
  VoltraLovesLiveActivity,
  LiquidGlassLiveActivityUI,
} from '../../components/live-activities/LiquidGlassLiveActivityUI'

const LiquidGlassLiveActivity: LiveActivityExampleComponent = forwardRef(
  ({ autoUpdate = true, autoStart = false, onIsActiveChange }, ref) => {
    const { start, update, end, isActive } = useVoltra(
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
