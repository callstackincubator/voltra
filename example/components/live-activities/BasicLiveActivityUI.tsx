import React from 'react'
import { Voltra } from 'voltra'

export function BasicLiveActivityUI() {
  return (
    <Voltra.VStack id="basic-live-activity" spacing={16} style={{ padding: 16 }}>
      <Voltra.VStack spacing={8} alignment="center">
        <Voltra.Mask
          style={{
            height: 100,
            width: 100,
          }}
          maskElement={
            <Voltra.GroupBox style={{ width: 100, height: 100, borderRadius: 12, backgroundColor: 'black' }} />
          }
        >
          <Voltra.VStack style={{ width: 100, height: 100, backgroundColor: 'yellow' }} />
        </Voltra.Mask>
        <Voltra.Timer endAtMs={Date.now() + 10000} />
        <Voltra.LinearProgressView style={{ marginTop: 100 }} value={50} progressColor="#00FF00" trackColor="red" />
        <Voltra.CircularProgressView value={50} progressColor="#00FF00" trackColor="red" />
        <Voltra.ZStack alignment="center">
          <Voltra.Image
            source={{ assetName: 'voltra-icon' }}
            style={{ width: 60, height: 60, borderRadius: 12 }}
            resizeMode="stretch"
          />

          <Voltra.Text
            style={{
              backgroundColor: '#8232FF',
              color: '#FFFFFF',
              fontSize: 10,
              fontWeight: '600',
              paddingHorizontal: 4,
              paddingVertical: 2,
              borderRadius: 6,
            }}
          >
            NEW
          </Voltra.Text>
        </Voltra.ZStack>

        <Voltra.Text
          style={{
            color: '#F0F9FF',
            fontSize: 28,
            fontWeight: '700',
            letterSpacing: -0.5,
          }}
        >
          Hello, Voltra!
        </Voltra.Text>
        <Voltra.Text
          style={{
            color: '#94A3B8',
            fontSize: 16,
            fontWeight: '500',
          }}
        >
          Welcome to your first Live Activity.
        </Voltra.Text>
      </Voltra.VStack>
    </Voltra.VStack>
  )
}