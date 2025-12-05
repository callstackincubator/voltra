import React, { forwardRef, useEffect, useImperativeHandle } from 'react'
import { useVoltra, Voltra } from 'voltra'

import { LiveActivityExampleComponent } from './types'

const VoltraLovesLiveActivity = () => {
  return (
    <Voltra.HStack alignment="center" spacing={12}>
      <Voltra.Text style={{ color: '#F8FAFC', fontSize: 24, fontWeight: '700', letterSpacing: -0.5 }}>
        Voltra
      </Voltra.Text>
      <Voltra.Symbol name="heart.fill" tintColor="#FF0000" size={32} />
      <Voltra.Text style={{ color: '#F8FAFC', fontSize: 24, fontWeight: '700', letterSpacing: -0.5 }}>
        liquid glass
      </Voltra.Text>
    </Voltra.HStack>
  )
}

function LiquidGlassLiveActivityUI() {
  return (
    <Voltra.GlassContainer spacing={10}>
      <Voltra.GlassView
        style={{ padding: 20, borderRadius: 24 }}
        modifiers={[{ name: 'glassEffect', args: { shape: 'roundedRect', cornerRadius: 24 } }]}
      >
        <VoltraLovesLiveActivity />
      </Voltra.GlassView>
    </Voltra.GlassContainer>
  )
}

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
        lockScreen: <LiquidGlassLiveActivityUI />,
      },
      {
        activityId: 'liquid-glass',
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
export { LiquidGlassLiveActivityUI }
