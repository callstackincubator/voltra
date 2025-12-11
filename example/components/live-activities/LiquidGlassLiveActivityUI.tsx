import React from 'react'
import { Voltra } from 'voltra'

export const VoltraLovesLiveActivity = () => {
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

export function LiquidGlassLiveActivityUI() {
  return (
    <Voltra.GlassContainer spacing={10}>
      <Voltra.VStack style={{ padding: 20, borderRadius: 24, glassEffect: true }}>
        <VoltraLovesLiveActivity />
      </Voltra.VStack>
    </Voltra.GlassContainer>
  )
}
