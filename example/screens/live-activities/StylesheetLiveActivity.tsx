import React, { forwardRef, useEffect, useImperativeHandle } from 'react'
import { StyleSheet } from 'react-native'
import { useVoltra, Voltra } from 'voltra'

import { LiveActivityExampleComponent } from './types'

const BOARDING_DURATION_MS = 120_000

const styles = StyleSheet.create({
  card: {
    padding: 16,
    borderRadius: 20,
    backgroundColor: '#0F172A',
  },
  title: {
    color: '#E0F2FE',
    fontSize: 18,
    fontWeight: '700',
  },
  subtitle: {
    marginTop: 6,
    color: '#94A3B8',
    fontSize: 14,
  },
  row: {
    marginTop: 14,
    alignItems: 'center',
  },
  flightNumber: {
    color: '#F8FAFC',
    fontSize: 20,
    fontWeight: '600',
  },
  statusChip: {
    marginTop: 16,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 999,
    backgroundColor: '#1D4ED8',
    color: '#E0F2FE',
    fontSize: 12,
    fontWeight: '600',
  },
  footer: {
    marginTop: 18,
    color: '#CBD5F5',
    fontSize: 13,
  },
})

const flatten = (style: any) => StyleSheet.flatten(style) as Record<string, any>

function StylesheetLiveActivityUI({ boardingStartAt }: { boardingStartAt: number }) {
  const boardingEndAt = boardingStartAt + BOARDING_DURATION_MS
  return (
    <Voltra.VStack identifier="stylesheet-live-activity" style={flatten(styles.card)}>
      <Voltra.Text style={flatten(styles.title)}>Morning Flight</Voltra.Text>
      <Voltra.Text style={flatten(styles.subtitle)}>SFO → JFK · Gate A10</Voltra.Text>

      <Voltra.HStack style={flatten(styles.row)}>
        <Voltra.Text style={flatten(styles.flightNumber)}>UA 2041</Voltra.Text>
        <Voltra.Spacer />
        <Voltra.Label title="Boarding" imageURL="figure.walk" style={flatten(styles.statusChip)} />
      </Voltra.HStack>

      <Voltra.Timer
        startAtMs={boardingStartAt}
        endAtMs={boardingEndAt}
        mode="text"
        textStyle="timer"
        textTemplates={{ running: 'Boarding closes in {time}', completed: 'Boarding closed' }}
        style={flatten(styles.footer)}
        modeStyles={{ text: { tintColor: '#38BDF8' } }}
      />
    </Voltra.VStack>
  )
}

const StylesheetLiveActivity: LiveActivityExampleComponent = forwardRef(
  ({ autoUpdate = true, autoStart = false, onIsActiveChange }, ref) => {
    const { start, update, end, isActive } = useVoltra(
      {
        lockScreen: <StylesheetLiveActivityUI boardingStartAt={Date.now()} />,
      },
      {
        autoUpdate,
        autoStart,
        deepLinkUrl: '/voltraui/stylesheet',
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

StylesheetLiveActivity.displayName = 'StylesheetLiveActivity'

export default StylesheetLiveActivity
export { StylesheetLiveActivityUI }
