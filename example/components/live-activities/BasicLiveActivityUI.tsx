import React from 'react'
import { Voltra } from 'voltra'

export function BasicLiveActivityUI() {
  return (
    <Voltra.VStack id="basic-live-activity" spacing={16} style={{ padding: 16 }}>
      <Voltra.LinearProgressView
        value={75}
        progressColor="#8232FF"
        // label={<Voltra.Text>Downloading...</Voltra.Text>}
        // currentValueLabel={<Voltra.Text>75%</Voltra.Text>}
      />
      <Voltra.Gauge
        value={50}
        minimumValue={0}
        maximumValue={100}
        tintColor="#8232FF"
        currentValueLabel={<Voltra.Text>50/100</Voltra.Text>}
      />
    </Voltra.VStack>
  )
}
