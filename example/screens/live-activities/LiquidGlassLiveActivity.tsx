import React, { forwardRef, useEffect, useImperativeHandle } from 'react'
import { useVoltra, Voltra } from 'voltra'

import { LiveActivityExampleComponent } from './types'

function LiquidGlassLiveActivityUI() {
  return (
    <Voltra.GlassContainer spacing={10}>
      <Voltra.GlassView
        style={{ padding: 20, borderRadius: 24 }}
        modifiers={[{ name: 'glassEffect', args: { shape: 'roundedRect', cornerRadius: 24 } }]}
      >
        <Voltra.HStack alignment="center" spacing={12}>
          <Voltra.Text style={{ color: '#F8FAFC', fontSize: 24, fontWeight: '700', letterSpacing: -0.5 }}>
            Voltra
          </Voltra.Text>
          <Voltra.Symbol name="heart.fill" tintColor="#FF0000" size={32} />
          <Voltra.Text style={{ color: '#F8FAFC', fontSize: 24, fontWeight: '700', letterSpacing: -0.5 }}>
            liquid glass
          </Voltra.Text>
        </Voltra.HStack>
      </Voltra.GlassView>
    </Voltra.GlassContainer>
  )
}

const LiquidGlassLiveActivity: LiveActivityExampleComponent = forwardRef(
  ({ autoUpdate = true, autoStart = false, onIsActiveChange }, ref) => {
    const { start, update, end, isActive } = useVoltra(
      {
        lockScreen: <LiquidGlassLiveActivityUI />,
      },
      {
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
