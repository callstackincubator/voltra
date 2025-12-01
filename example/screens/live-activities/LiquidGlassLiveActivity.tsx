import React, { forwardRef, useEffect, useImperativeHandle } from 'react'
import { useVoltra, Voltra } from 'voltra'

import { LiveActivityExampleComponent } from './types'

const SESSION_DURATION_MS = 45_000
const COOLDOWN_DURATION_MS = 20_000

function LiquidGlassLiveActivityUI({ sessionStartAt }: { sessionStartAt: number }) {
  const sessionEndAt = sessionStartAt + SESSION_DURATION_MS
  const cooldownEndAt = sessionStartAt + COOLDOWN_DURATION_MS
  return (
    <Voltra.GlassContainer spacing={10}>
      <Voltra.GlassView
        style={{ padding: 18, borderRadius: 22 }}
        modifiers={[{ name: 'glassEffect', args: { shape: 'roundedRect', cornerRadius: 22 } }]}
      >
        <Voltra.VStack>
          <Voltra.Text style={{ color: '#F8FAFC', fontSize: 18, fontWeight: '600' }}>Studio Session</Voltra.Text>
          <Voltra.Timer
            startAtMs={sessionStartAt}
            endAtMs={sessionEndAt}
            mode="text"
            textStyle="timer"
            textTemplates={{ running: 'Session ends in {time}', completed: 'Workout complete' }}
            style={{ color: '#CBD5F5', fontSize: 13, marginTop: 4 }}
          />
          <Voltra.ProgressView
            startAtMs={sessionStartAt}
            endAtMs={sessionEndAt}
            mode="bar"
            style={{ tintColor: '#34D399', marginTop: 12, height: 6, borderRadius: 4 }}
          />
          <Voltra.HStack style={{ marginTop: 14, alignItems: 'center' }}>
            <Voltra.SymbolView
              name="figure.strengthtraining.traditional"
              tintColor="#34D399"
              style={{ width: 32, height: 32 }}
            />
            <Voltra.Text style={{ color: '#34D399', marginLeft: 8, fontWeight: '600' }}>Active</Voltra.Text>
            <Voltra.Spacer />
            <Voltra.Timer
              startAtMs={sessionStartAt}
              endAtMs={sessionEndAt}
              mode="text"
              textStyle="relative"
              style={{ color: '#F8FAFC', fontSize: 16, fontWeight: '500' }}
              textTemplates={{ running: '{time}', completed: '00:00' }}
            />
          </Voltra.HStack>
        </Voltra.VStack>
      </Voltra.GlassView>

      <Voltra.GlassView
        style={{ paddingHorizontal: 16, paddingVertical: 10, borderRadius: 999 }}
        modifiers={[{ name: 'glassEffect', args: { shape: 'capsule' } }]}
      >
        <Voltra.HStack style={{ alignItems: 'center' }}>
          <Voltra.SymbolView name="heart.fill" tintColor="#F472B6" style={{ width: 20, height: 20 }} />
          <Voltra.Text style={{ color: '#F8FAFC', fontWeight: '600', marginLeft: 8 }}>HR 132</Voltra.Text>
          <Voltra.Spacer />
          <Voltra.Timer
            startAtMs={sessionStartAt}
            endAtMs={cooldownEndAt}
            mode="text"
            textStyle="timer"
            textTemplates={{ running: 'Next interval in {time}', completed: 'Interval done' }}
            style={{ color: '#F8FAFC', opacity: 0.8 }}
          />
        </Voltra.HStack>
      </Voltra.GlassView>
    </Voltra.GlassContainer>
  )
}

const LiquidGlassLiveActivity: LiveActivityExampleComponent = forwardRef(
  ({ autoUpdate = true, autoStart = false, onIsActiveChange }, ref) => {
    const { start, update, end, isActive } = useVoltra(
      {
        lockScreen: <LiquidGlassLiveActivityUI sessionStartAt={Date.now()} />,
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
