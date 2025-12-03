import React, { forwardRef, useEffect, useImperativeHandle } from 'react'
import { useVoltra, Voltra } from 'voltra'

import { LiveActivityExampleComponent } from './types'

const ETA_DURATION_MS = 90_000

function BasicLiveActivityUI({ etaStartAt }: { etaStartAt: number }) {
  const etaEndAt = etaStartAt + ETA_DURATION_MS
  return (
    <Voltra.VStack id="basic-live-activity" style={{ padding: 16, borderRadius: 18, backgroundColor: '#101828' }}>
      <Voltra.SymbolView name="car.fill" type="hierarchical" scale="large" tintColor="#38BDF8" />
      <Voltra.Text style={{ color: '#F8FAFC', fontSize: 18, fontWeight: '600' }}>Driver en route</Voltra.Text>
      <Voltra.Label
        title="Rider: Camila • LX27"
        systemImage="car.fill"
        style={{ color: '#CBD5F5', fontSize: 14, marginTop: 6 }}
      />
      <Voltra.Timer
        startAtMs={etaStartAt}
        endAtMs={etaEndAt}
        mode="text"
        textStyle="timer"
        textTemplates={{ running: 'Arrives in {time}', completed: 'Driver arrived' }}
        style={{ color: '#CBD5F5', fontSize: 12, marginTop: 4 }}
        modeStyles={{ text: { fontSize: 14, tintColor: '#38BDF8' } }}
      />
      <Voltra.Text style={{ color: '#94A3B8', fontSize: 12, marginTop: 8 }}>Building A · Lobby pickup</Voltra.Text>
      <Voltra.Button title="Contact driver" id="contact-driver" style={{ marginTop: 12 }} />
      <Voltra.Toggle title="Toggle" id="toggle" value={true} />
    </Voltra.VStack>
  )
}

const BasicLiveActivity: LiveActivityExampleComponent = forwardRef(
  ({ autoUpdate = true, autoStart = false, onIsActiveChange }, ref) => {
    const { start, update, end, isActive } = useVoltra(
      {
        lockScreen: <BasicLiveActivityUI etaStartAt={Date.now()} />,
      },
      {
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
export { BasicLiveActivityUI }
