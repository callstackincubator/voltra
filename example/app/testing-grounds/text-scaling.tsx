import React from 'react'
import { StyleSheet, View } from 'react-native'
import * as Voltra from 'voltra'

import { Button } from '~/components/Button'
import { LiveActivityPreview } from '~/components/LiveActivityPreview'

export default function TextScalingScreen() {
  return (
    <View style={styles.container}>
      <LiveActivityPreview
        title="Text Scaling Playground"
        description="Test adjustsFontSizeToFit, allowFontScaling, and maxFontSizeMultiplier."
      >
        <Voltra.VStack alignment="leading" spacing={10}>
          <Voltra.Text style={{ fontSize: 16, fontWeight: 'bold' }}>
            adjustsFontSizeToFit + numberOfLines={1}
          </Voltra.Text>
          <Voltra.VStack style={{ width: 100, height: 30, backgroundColor: '#333' }}>
            <Voltra.Text
              numberOfLines={1}
              adjustsFontSizeToFit={true}
              minimumFontScale={0.5}
              style={{ fontSize: 24, color: '#FFF' }}
            >
              This is a very long text that should scale down
            </Voltra.Text>
          </Voltra.VStack>

          <Voltra.Text style={{ fontSize: 16, fontWeight: 'bold', marginTop: 10 }}>
            allowFontScaling={false}
          </Voltra.Text>
          <Voltra.Text allowFontScaling={false} style={{ fontSize: 18, color: '#FFF' }}>
            This text won't grow with system settings
          </Voltra.Text>

          <Voltra.Text style={{ fontSize: 16, fontWeight: 'bold', marginTop: 10 }}>
            maxFontSizeMultiplier={1.2}
          </Voltra.Text>
          <Voltra.Text maxFontSizeMultiplier={1.2} style={{ fontSize: 18, color: '#FFF' }}>
            This text is capped at 1.2x scale
          </Voltra.Text>
        </Voltra.VStack>
      </LiveActivityPreview>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
    padding: 20,
  },
})
