import React from 'react'
import { Voltra } from 'voltra'

export function DeepLinksLiveActivityUI() {
  return (
    <Voltra.HStack id="deep-links-live-activity" spacing={8} style={{ padding: 16 }} alignment="top">
      {/* Link Examples */}
      <Voltra.VStack spacing={10} style={{ flex: 1 }}>
        {/* Link with absolute URL */}
        <Voltra.Link destination="myapp://orders/123">
          <Voltra.HStack
            spacing={8}
            style={{
              padding: 12,
              backgroundColor: '#1E293B',
              borderRadius: 10,
            }}
          >
            <Voltra.Symbol name="bag.fill" tintColor="#F59E0B" size={20} />
            <Voltra.VStack spacing={2} alignment="leading">
              <Voltra.Text style={{ color: '#FFFFFF', fontSize: 14, fontWeight: '600' }}>Order #123</Voltra.Text>
              <Voltra.Text style={{ color: '#94A3B8', fontSize: 11 }}>Tap to view details</Voltra.Text>
            </Voltra.VStack>
            <Voltra.Spacer />
            <Voltra.Symbol name="chevron.right" tintColor="#64748B" size={14} />
          </Voltra.HStack>
        </Voltra.Link>

        {/* Link with relative path */}
        <Voltra.Link destination="/settings">
          <Voltra.HStack
            spacing={8}
            style={{
              padding: 12,
              backgroundColor: '#1E293B',
              borderRadius: 10,
            }}
          >
            <Voltra.Symbol name="gearshape.fill" tintColor="#8B5CF6" size={20} />
            <Voltra.VStack spacing={2} alignment="leading">
              <Voltra.Text style={{ color: '#FFFFFF', fontSize: 14, fontWeight: '600' }}>Settings</Voltra.Text>
              <Voltra.Text style={{ color: '#94A3B8', fontSize: 11 }}>Manage preferences</Voltra.Text>
            </Voltra.VStack>
            <Voltra.Spacer />
            <Voltra.Symbol name="chevron.right" tintColor="#64748B" size={14} />
          </Voltra.HStack>
        </Voltra.Link>
      </Voltra.VStack>
    </Voltra.HStack>
  )
}
