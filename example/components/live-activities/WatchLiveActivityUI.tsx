import React from 'react'
import { Voltra } from 'voltra'

export function WatchLiveActivityLockScreen() {
  return (
    <Voltra.VStack id="watch-lock-screen" spacing={12} style={{ padding: 16 }}>
      <Voltra.HStack spacing={12} alignment="center">
        <Voltra.Image
          source={{ assetName: 'voltra-icon' }}
          style={{ width: 48, height: 48, borderRadius: 10 }}
          resizeMode="stretch"
        />
        <Voltra.VStack spacing={4} alignment="leading">
          <Voltra.Text
            style={{
              color: '#F0F9FF',
              fontSize: 20,
              fontWeight: '700',
            }}
          >
            Workout Active
          </Voltra.Text>
          <Voltra.Text
            style={{
              color: '#94A3B8',
              fontSize: 14,
            }}
          >
            Running · 3.2 km
          </Voltra.Text>
        </Voltra.VStack>
      </Voltra.HStack>

      <Voltra.HStack distribution="equalSpacing">
        <Voltra.VStack alignment="center">
          <Voltra.Text style={{ color: '#10B981', fontSize: 24, fontWeight: '700' }}>25:42</Voltra.Text>
          <Voltra.Text style={{ color: '#64748B', fontSize: 12 }}>Duration</Voltra.Text>
        </Voltra.VStack>
        <Voltra.VStack alignment="center">
          <Voltra.Text style={{ color: '#F59E0B', fontSize: 24, fontWeight: '700' }}>142</Voltra.Text>
          <Voltra.Text style={{ color: '#64748B', fontSize: 12 }}>BPM</Voltra.Text>
        </Voltra.VStack>
        <Voltra.VStack alignment="center">
          <Voltra.Text style={{ color: '#8B5CF6', fontSize: 24, fontWeight: '700' }}>312</Voltra.Text>
          <Voltra.Text style={{ color: '#64748B', fontSize: 12 }}>Calories</Voltra.Text>
        </Voltra.VStack>
      </Voltra.HStack>
    </Voltra.VStack>
  )
}

export function WatchLiveActivitySmall() {
  return (
    <Voltra.VStack id="watch-small" spacing={4} alignment="center" style={{ padding: 8 }}>
      <Voltra.Text style={{ color: '#10B981', fontSize: 18, fontWeight: '700' }}>25:42</Voltra.Text>
      <Voltra.Text style={{ color: '#F59E0B', fontSize: 14, fontWeight: '600' }}>142 BPM</Voltra.Text>
    </Voltra.VStack>
  )
}
