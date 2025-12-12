import React from 'react'
import { Voltra } from 'voltra'

type CompassLiveActivityUIProps = {
  /** Heading in degrees (0-360, where 0 = North) */
  heading: number
}

/**
 * Lock Screen variant for Compass Live Activity
 * Shows arrow on the left (rotated) and heading degrees on the right
 */
export function CompassLiveActivityLockScreen({ heading }: CompassLiveActivityUIProps) {
  const headingText = `${Math.round(heading)}°`
  const direction = getCardinalDirection(heading)

  return (
    <Voltra.HStack id="compass-live-activity" spacing={16} style={{ padding: 16 }}>
      {/* Left side: Rotated arrow */}
      <Voltra.VStack
        alignment="center"
        style={{
          width: 48,
          height: 48,
          backgroundColor: 'rgba(59, 130, 246, 0.2)',
          borderRadius: 24,
        }}
      >
        <Voltra.Symbol
          name="location.north.fill"
          tintColor="#3B82F6"
          size={28}
          style={{
            transform: [{ rotate: `${heading}deg` }],
          }}
        />
      </Voltra.VStack>

      {/* Right side: Heading info */}
      <Voltra.VStack alignment="leading" spacing={2} style={{ flex: 1 }}>
        <Voltra.HStack spacing={8}>
          <Voltra.Text
            style={{
              color: '#FFFFFF',
              fontSize: 28,
              fontWeight: '700',
              fontVariant: ['tabular-nums'],
            }}
          >
            {headingText}
          </Voltra.Text>
          <Voltra.Text
            style={{
              color: '#3B82F6',
              fontSize: 20,
              fontWeight: '600',
            }}
          >
            {direction}
          </Voltra.Text>
        </Voltra.HStack>
        <Voltra.Text
          style={{
            color: '#94A3B8',
            fontSize: 12,
            fontWeight: '500',
          }}
        >
          Magnetic North
        </Voltra.Text>
      </Voltra.VStack>
    </Voltra.HStack>
  )
}

/**
 * Dynamic Island Expanded - Leading (top left)
 */
export function CompassLiveActivityIslandExpandedLeading() {
  return (
    <Voltra.Text
      style={{
        color: '#FFFFFF',
        fontSize: 14,
        fontWeight: '600',
        paddingTop: 4,
        paddingLeft: 6,
      }}
    >
      Compass
    </Voltra.Text>
  )
}

/**
 * Dynamic Island Expanded - Trailing (top right)
 */
export function CompassLiveActivityIslandExpandedTrailing({ heading }: CompassLiveActivityUIProps) {
  return (
    <Voltra.Text
      style={{
        color: '#3B82F6',
        fontSize: 14,
        fontWeight: '600',
        paddingTop: 4,
        paddingRight: 6,
      }}
    >
      {getCardinalDirection(heading)}
    </Voltra.Text>
  )
}

/**
 * Dynamic Island Expanded - Bottom content
 * Shows arrow on the left and heading on the right
 */
export function CompassLiveActivityIslandExpandedBottom({ heading }: CompassLiveActivityUIProps) {
  const headingText = `${Math.round(heading)}°`

  return (
    <Voltra.HStack spacing={16} style={{ paddingHorizontal: 12, paddingBottom: 12 }}>
      {/* Left side: Rotated arrow */}
      <Voltra.VStack
        alignment="center"
        style={{
          width: 40,
          height: 40,
          backgroundColor: 'rgba(59, 130, 246, 0.2)',
          borderRadius: 20,
        }}
      >
        <Voltra.Symbol
          name="location.north.fill"
          tintColor="#3B82F6"
          size={24}
          style={{
            transform: [{ rotate: `${heading}deg` }],
          }}
        />
      </Voltra.VStack>

      {/* Right side: Heading */}
      <Voltra.VStack alignment="leading" spacing={2} style={{ flex: 1 }}>
        <Voltra.Text
          style={{
            color: '#FFFFFF',
            fontSize: 24,
            fontWeight: '700',
            fontVariant: ['tabular-nums'],
          }}
        >
          {headingText}
        </Voltra.Text>
        <Voltra.Text
          style={{
            color: '#94A3B8',
            fontSize: 11,
            fontWeight: '500',
          }}
        >
          Magnetic heading
        </Voltra.Text>
      </Voltra.VStack>
    </Voltra.HStack>
  )
}

/**
 * Dynamic Island Compact - Leading (left side)
 * Shows rotated arrow
 */
export function CompassLiveActivityIslandCompactLeading({ heading }: CompassLiveActivityUIProps) {
  return (
    <Voltra.Symbol
      name="location.north.fill"
      tintColor="#3B82F6"
      size={16}
      style={{
        transform: [{ rotate: `${heading}deg` }],
      }}
    />
  )
}

/**
 * Dynamic Island Compact - Trailing (right side)
 * Shows heading degrees
 */
export function CompassLiveActivityIslandCompactTrailing({ heading }: CompassLiveActivityUIProps) {
  return (
    <Voltra.Text
      style={{
        color: '#FFFFFF',
        fontSize: 14,
        fontWeight: '600',
        fontVariant: ['tabular-nums'],
      }}
    >
      {Math.round(heading)}°
    </Voltra.Text>
  )
}

/**
 * Dynamic Island Minimal (small circle on the right when another app uses the island)
 */
export function CompassLiveActivityIslandMinimal({ heading }: CompassLiveActivityUIProps) {
  return (
    <Voltra.Symbol
      name="location.north.fill"
      tintColor="#3B82F6"
      size={14}
      style={{
        transform: [{ rotate: `${heading}deg` }],
      }}
    />
  )
}

/**
 * Get cardinal direction from heading degrees
 */
function getCardinalDirection(heading: number): string {
  const directions = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW']
  const index = Math.round(heading / 45) % 8
  return directions[index]
}
