import React, { forwardRef, useEffect, useImperativeHandle } from 'react'
import { useVoltra, Voltra } from 'voltra'

import { LiveActivityExampleComponent } from './types'

function FlightLiveActivityUI() {
  return (
    <Voltra.VStack id="flight-live-activity" spacing={8} style={{ padding: 12, flex: 1 }}>
      <Voltra.HStack>
        <Voltra.Symbol name="airplane" tintColor="#FFFFFF" size={14} />
        <Voltra.Text
          style={{
            color: '#FFFFFF',
            fontSize: 16,
            fontWeight: '600',
          }}
        >
          UA2645
        </Voltra.Text>

        <Voltra.Spacer />

        <Voltra.Text
          style={{
            color: '#FFFFFF',
            fontSize: 14,
            fontWeight: '500',
          }}
        >
          FLIGHTY
        </Voltra.Text>
      </Voltra.HStack>

      <Voltra.HStack spacing={0}>
        <Voltra.VStack spacing={4}>
          <Voltra.HStack style={{ flexShrink: 1 }}>
            <Voltra.Text
              style={{
                color: '#FFFFFF',
                fontSize: 24,
                fontWeight: '700',
                letterSpacing: -1,
              }}
            >
              EWR
            </Voltra.Text>
            <Voltra.Text
              style={{
                color: '#34D399',
                fontSize: 18,
                fontWeight: '600',
              }}
            >
              8:45 PM
            </Voltra.Text>
          </Voltra.HStack>
          <Voltra.HStack spacing={4} style={{ flexShrink: 1 }}>
            <Voltra.Text
              style={{
                color: '#94A3B8',
                fontSize: 12,
                fontWeight: '500',
              }}
            >
              TC
            </Voltra.Text>
            <Voltra.Text
              style={{
                color: '#34D399',
                fontSize: 12,
                fontWeight: '500',
              }}
            >
              On Time
            </Voltra.Text>
          </Voltra.HStack>
        </Voltra.VStack>

        <Voltra.HStack spacing={4} style={{ flexShrink: 1 }}>
          <Voltra.Symbol name="circle.fill" tintColor="#94A3B8" size={3} />
          <Voltra.Symbol name="circle.fill" tintColor="#94A3B8" size={3} />
          <Voltra.Symbol name="airplane" tintColor="#94A3B8" size={16} />
          <Voltra.Symbol name="circle.fill" tintColor="#94A3B8" size={3} />
          <Voltra.Symbol name="circle.fill" tintColor="#94A3B8" size={3} />
        </Voltra.HStack>

        <Voltra.VStack spacing={4} alignment="trailing">
          <Voltra.HStack style={{ flexShrink: 1 }}>
            <Voltra.Text
              style={{
                color: '#F87171',
                fontSize: 18,
                fontWeight: '600',
              }}
            >
              12:02 AM
            </Voltra.Text>
            <Voltra.Text
              style={{
                color: '#FFFFFF',
                fontSize: 24,
                fontWeight: '700',
                letterSpacing: -1,
              }}
            >
              FLL
            </Voltra.Text>
          </Voltra.HStack>
          <Voltra.Text
            style={{
              color: '#F87171',
              fontSize: 12,
              fontWeight: '500',
            }}
          >
            3m late
          </Voltra.Text>
        </Voltra.VStack>
      </Voltra.HStack>

      <Voltra.HStack style={{ marginTop: 12 }}>
        <Voltra.VStack spacing={2}>
          <Voltra.HStack spacing={0} style={{ flexShrink: 1 }}>
            <Voltra.Text
              style={{
                color: '#94A3B8',
                fontSize: 13,
                fontWeight: '500',
              }}
            >
              Gate Departure in{' '}
            </Voltra.Text>
            <Voltra.Text
              style={{
                color: '#34D399',
                fontSize: 13,
                fontWeight: '600',
              }}
            >
              1h 42m
            </Voltra.Text>
          </Voltra.HStack>
          <Voltra.Text
            style={{
              color: '#64748B',
              fontSize: 11,
              fontWeight: '400',
            }}
          >
            EWR departures avg 24m late
          </Voltra.Text>
        </Voltra.VStack>

        <Voltra.HStack
          spacing={4}
          style={{
            backgroundColor: '#FCD34D',
            paddingHorizontal: 10,
            paddingVertical: 6,
            borderRadius: 12,
            flexShrink: 1,
          }}
        >
          <Voltra.Symbol name="arrow.up.right" tintColor="#000000" size={14} />
          <Voltra.Text
            style={{
              color: '#000000',
              fontSize: 14,
              fontWeight: '600',
            }}
          >
            134
          </Voltra.Text>
        </Voltra.HStack>
      </Voltra.HStack>
    </Voltra.VStack>
  )
}

const FlightLiveActivity: LiveActivityExampleComponent = forwardRef(
  ({ autoUpdate = true, autoStart = false, onIsActiveChange }, ref) => {
    const { start, update, end, isActive } = useVoltra(
      {
        lockScreen: <FlightLiveActivityUI />,
        island: {
          compact: {
            leading: <Voltra.Symbol name="airplane" tintColor="#FFFFFF" size={14} />,
            trailing: (
              <Voltra.HStack
                spacing={4}
                style={{
                  backgroundColor: '#FCD34D',
                  paddingHorizontal: 10,
                  paddingVertical: 6,
                  borderRadius: 12,
                }}
              >
                <Voltra.Text
                  style={{
                    color: '#000000',
                    fontSize: 14,
                    fontWeight: '600',
                  }}
                >
                  134
                </Voltra.Text>
              </Voltra.HStack>
            ),
          },
        },
      },
      {
        activityId: 'flight',
        autoUpdate,
        autoStart,
        deepLinkUrl: '/voltraui/flight',
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

FlightLiveActivity.displayName = 'FlightLiveActivity'

export default FlightLiveActivity
export { FlightLiveActivityUI }
