import React from 'react'
import { Voltra } from 'voltra'
import { VoltraView } from 'voltra/client'

export type PositioningExampleProps = {
  testID?: string
}

export function StaticPositioningExample({ testID }: PositioningExampleProps) {
  return (
    <VoltraView testID={testID} style={{ width: '100%', height: 150, backgroundColor: '#1E293B' }}>
      <Voltra.ZStack alignment="center">
        {/* This box has left/top but NO position - should be centered and ignore left/top */}
        <Voltra.VStack
          style={{
            position: 'static',
            backgroundColor: '#3B82F6',
            width: 80,
            height: 60,
            borderRadius: 8,
            borderWidth: 2,
            borderColor: '#60A5FA',
            left: 100, // Should be IGNORED
            top: 100, // Should be IGNORED
          }}
        >
          <Voltra.Text style={{ color: 'white', fontSize: 12 }}>Static</Voltra.Text>
          <Voltra.Text style={{ color: '#93C5FD', fontSize: 10 }}>(Centered)</Voltra.Text>
        </Voltra.VStack>
      </Voltra.ZStack>
    </VoltraView>
  )
}

export function RelativePositioningBasicExample({ testID }: PositioningExampleProps) {
  return (
    <VoltraView testID={testID} style={{ width: '100%', height: 150, backgroundColor: '#1E293B' }}>
      <Voltra.ZStack alignment="topLeading">
        {/* Reference box showing natural position (top-left) */}
        <Voltra.VStack
          style={{
            backgroundColor: '#64748B',
            width: 80,
            height: 60,
            borderRadius: 8,
            opacity: 0.4,
          }}
        >
          <Voltra.Text style={{ color: 'white', fontSize: 10 }}>Natural</Voltra.Text>
        </Voltra.VStack>

        {/* Relatively positioned box - offset from natural position */}
        <Voltra.VStack
          style={{
            position: 'relative',
            left: 20,
            top: 10,
            backgroundColor: '#10B981',
            width: 80,
            height: 60,
            borderRadius: 8,
            borderWidth: 2,
            borderColor: '#34D399',
          }}
        >
          <Voltra.Text style={{ color: 'white', fontSize: 12 }}>Relative</Voltra.Text>
          <Voltra.Text style={{ color: '#A7F3D0', fontSize: 10 }}>+20, +10</Voltra.Text>
        </Voltra.VStack>
      </Voltra.ZStack>
    </VoltraView>
  )
}

export function RelativePositioningNegativeExample({ testID }: PositioningExampleProps) {
  return (
    <VoltraView testID={testID} style={{ width: '100%', height: 150, backgroundColor: '#1E293B' }}>
      <Voltra.ZStack alignment="center">
        {/* Reference box at center */}
        <Voltra.VStack
          style={{
            backgroundColor: '#64748B',
            width: 80,
            height: 60,
            borderRadius: 8,
            opacity: 0.4,
          }}
        >
          <Voltra.Text style={{ color: 'white', fontSize: 10 }}>Natural</Voltra.Text>
        </Voltra.VStack>

        {/* Relatively positioned with negative offset */}
        <Voltra.VStack
          style={{
            position: 'relative',
            left: -15,
            top: -15,
            backgroundColor: '#F59E0B',
            width: 80,
            height: 60,
            borderRadius: 8,
            borderWidth: 2,
            borderColor: '#FBBF24',
          }}
        >
          <Voltra.Text style={{ color: 'white', fontSize: 12 }}>Relative</Voltra.Text>
          <Voltra.Text style={{ color: '#FDE68A', fontSize: 10 }}>-15, -15</Voltra.Text>
        </Voltra.VStack>
      </Voltra.ZStack>
    </VoltraView>
  )
}

export function AbsolutePositioningBasicExample({ testID }: PositioningExampleProps) {
  return (
    <VoltraView testID={testID} style={{ width: '100%', height: 150, backgroundColor: '#1E293B' }}>
      <Voltra.ZStack alignment="topLeading">
        {/* Crosshair marker at (50, 50) to show center point */}
        <Voltra.VStack
          style={{
            position: 'absolute',
            left: 50,
            top: 50,
            width: 10,
            height: 10,
            backgroundColor: '#EF4444',
            borderRadius: 5,
          }}
        />

        {/* Absolutely positioned box - center should be at (50, 50) */}
        <Voltra.VStack
          style={{
            position: 'absolute',
            left: 50,
            top: 50,
            backgroundColor: '#8B5CF6',
            width: 80,
            height: 60,
            borderRadius: 8,
            borderWidth: 2,
            borderColor: '#A78BFA',
          }}
        >
          <Voltra.Text style={{ color: 'white', fontSize: 12 }}>Absolute</Voltra.Text>
          <Voltra.Text style={{ color: '#DDD6FE', fontSize: 10 }}>@50, 50</Voltra.Text>
        </Voltra.VStack>
      </Voltra.ZStack>
    </VoltraView>
  )
}

export function AbsolutePositioningCornersExample({ testID }: PositioningExampleProps) {
  return (
    <VoltraView testID={testID} style={{ width: '100%', height: 200, backgroundColor: '#1E293B' }}>
      <Voltra.VStack style={{ width: 230, height: 200, borderColor: '#FFFFFF', borderWidth: 1 }}>
        <Voltra.ZStack alignment="topLeading">
          {/* Top-left box */}
          <Voltra.VStack
            style={{
              position: 'absolute',
              left: 30,
              top: 30,
              backgroundColor: '#3B82F6',
              width: 50,
              height: 40,
              borderRadius: 6,
              opacity: 0.9,
            }}
          >
            <Voltra.Text style={{ color: 'white', fontSize: 8 }}>30,30</Voltra.Text>
          </Voltra.VStack>

          {/* Bottom-right box */}
          <Voltra.VStack
            style={{
              position: 'absolute',
              left: 200,
              top: 170,
              backgroundColor: '#10B981',
              width: 50,
              height: 40,
              borderRadius: 6,
              opacity: 0.9,
            }}
          >
            <Voltra.Text style={{ color: 'white', fontSize: 8 }}>200,170</Voltra.Text>
          </Voltra.VStack>

          {/* Center box */}
          <Voltra.VStack
            style={{
              position: 'absolute',
              left: 115,
              top: 100,
              backgroundColor: '#F59E0B',
              width: 50,
              height: 40,
              borderRadius: 6,
              opacity: 0.9,
            }}
          >
            <Voltra.Text style={{ color: 'white', fontSize: 8 }}>115,100</Voltra.Text>
          </Voltra.VStack>

          {/* Center marker */}
          <Voltra.VStack
            style={{
              position: 'absolute',
              left: 115,
              top: 100,
              width: 6,
              height: 6,
              backgroundColor: '#FF0000',
              borderRadius: 3,
            }}
          />

          {/* Bottom-right corner marker */}
          <Voltra.VStack
            style={{
              position: 'absolute',
              left: 200,
              top: 170,
              width: 6,
              height: 6,
              backgroundColor: '#EF4444',
              borderRadius: 3,
            }}
          />

          {/* Top-left corner marker */}
          <Voltra.VStack
            style={{
              position: 'absolute',
              left: 30,
              top: 30,
              width: 6,
              height: 6,
              backgroundColor: '#EF4444',
              borderRadius: 3,
            }}
          />
        </Voltra.ZStack>
      </Voltra.VStack>
    </VoltraView>
  )
}

export function ZIndexLayeringExample({ testID }: PositioningExampleProps) {
  return (
    <VoltraView testID={testID} style={{ width: '100%', height: 150, backgroundColor: '#1E293B' }}>
      <Voltra.ZStack alignment="center">
        {/* Bottom layer (zIndex: 1) */}
        <Voltra.VStack
          style={{
            position: 'absolute',
            left: 80,
            top: 60,
            zIndex: 1,
            backgroundColor: '#3B82F6',
            width: 70,
            height: 70,
            borderRadius: 8,
            borderWidth: 2,
            borderColor: '#60A5FA',
          }}
        >
          <Voltra.Text style={{ color: 'white', fontSize: 10 }}>z: 1</Voltra.Text>
        </Voltra.VStack>

        {/* Middle layer (zIndex: 2) */}
        <Voltra.VStack
          style={{
            position: 'absolute',
            left: 110,
            top: 75,
            zIndex: 2,
            backgroundColor: '#10B981',
            width: 70,
            height: 70,
            borderRadius: 8,
            borderWidth: 2,
            borderColor: '#34D399',
          }}
        >
          <Voltra.Text style={{ color: 'white', fontSize: 10 }}>z: 2</Voltra.Text>
        </Voltra.VStack>

        {/* Top layer (zIndex: 3) */}
        <Voltra.VStack
          style={{
            position: 'absolute',
            left: 140,
            top: 90,
            zIndex: 3,
            backgroundColor: '#F59E0B',
            width: 70,
            height: 70,
            borderRadius: 8,
            borderWidth: 2,
            borderColor: '#FBBF24',
          }}
        >
          <Voltra.Text style={{ color: 'white', fontSize: 10 }}>z: 3</Voltra.Text>
        </Voltra.VStack>
      </Voltra.ZStack>
    </VoltraView>
  )
}

export function BadgeOverlayExample({ testID }: PositioningExampleProps) {
  return (
    <VoltraView testID={testID} style={{ width: '100%', height: 120 }}>
      <Voltra.HStack
        alignment="center"
        style={{
          backgroundColor: '#1F2937',
          borderRadius: 12,
          padding: 12,
          borderWidth: 1,
          borderColor: '#374151',
        }}
      >
        {/* Avatar with badge overlay */}
        <Voltra.ZStack style={{ width: 50, height: 50 }}>
          <Voltra.VStack
            style={{
              backgroundColor: '#6366F1',
              width: 50,
              height: 50,
              borderRadius: 25,
            }}
          />

          {/* Notification Badge - Absolutely positioned on avatar */}
          <Voltra.VStack
            style={{
              position: 'absolute',
              left: 40,
              top: 5,
              backgroundColor: '#EF4444',
              width: 20,
              height: 20,
              borderRadius: 10,
              borderWidth: 2,
              borderColor: '#1F2937',
            }}
          >
            <Voltra.Text style={{ color: 'white', fontSize: 10, fontWeight: 'bold' }}>3</Voltra.Text>
          </Voltra.VStack>
        </Voltra.ZStack>

        {/* Info */}
        <Voltra.VStack style={{ paddingLeft: 12, flexGrow: 1 }}>
          <Voltra.Text style={{ color: 'white', fontSize: 14, fontWeight: 'bold' }}>John Doe</Voltra.Text>
          <Voltra.Text style={{ color: '#9CA3AF', fontSize: 12 }}>Software Engineer</Voltra.Text>
        </Voltra.VStack>
      </Voltra.HStack>
    </VoltraView>
  )
}
