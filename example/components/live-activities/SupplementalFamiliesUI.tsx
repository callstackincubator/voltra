import React from 'react'
import { Voltra } from 'voltra'

export function SupplementalFamiliesLockScreen() {
  return (
    <Voltra.VStack id="supplemental-families-lock-screen" spacing={12} style={{ padding: 16 }}>
      <Voltra.Text
        style={{
          color: '#F0F9FF',
          fontSize: 24,
          fontWeight: '700',
        }}
      >
        Lock Screen
      </Voltra.Text>
    </Voltra.VStack>
  )
}

export function SupplementalFamiliesSmall() {
  return (
    <Voltra.VStack id="supplemental-families-small" spacing={4} alignment="center" style={{ padding: 8 }}>
      <Voltra.Text style={{ color: '#3B82F6', fontSize: 16, fontWeight: '700' }}>Watch</Voltra.Text>
      <Voltra.Text style={{ color: '#94A3B8', fontSize: 11 }}>watchOS / CarPlay</Voltra.Text>
    </Voltra.VStack>
  )
}

export function SupplementalFamiliesCompactLeading() {
  return (
    <Voltra.VStack id="supplemental-families-compact-leading" alignment="center" style={{ padding: 6 }}>
      <Voltra.Text style={{ color: '#10B981', fontSize: 14, fontWeight: '700' }}>L</Voltra.Text>
    </Voltra.VStack>
  )
}

export function SupplementalFamiliesCompactTrailing() {
  return (
    <Voltra.VStack id="supplemental-families-compact-trailing" alignment="center" style={{ padding: 6 }}>
      <Voltra.Text style={{ color: '#10B981', fontSize: 14, fontWeight: '700' }}>R</Voltra.Text>
    </Voltra.VStack>
  )
}

export function SupplementalFamiliesMinimal() {
  return (
    <Voltra.VStack id="supplemental-families-minimal" alignment="center" style={{ padding: 6 }}>
      <Voltra.Symbol name="checkmark.circle.fill" tintColor="#10B981" />
    </Voltra.VStack>
  )
}
