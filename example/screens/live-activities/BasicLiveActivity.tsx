import React, { forwardRef, useEffect, useImperativeHandle } from 'react'
import { useVoltra, Voltra } from 'voltra'

import { LiveActivityExampleComponent } from './types'

function BasicLiveActivityUI() {
  return (
    <Voltra.VStack id="basic-live-activity" spacing={16} style={{ padding: 16 }}>
      <Voltra.VStack spacing={8}>
        <Voltra.Image
          source={{ assetName: 'voltra-icon' }}
          style={{ width: 60, height: 60, borderRadius: 12 }}
          resizeMode="stretch"
        />

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
          Welcome to your first Live Activity
        </Voltra.Text>
      </Voltra.VStack>
    </Voltra.VStack>
  )
}

const BasicLiveActivity: LiveActivityExampleComponent = forwardRef(
  ({ autoUpdate = true, autoStart = false, onIsActiveChange }, ref) => {
    const { start, update, end, isActive } = useVoltra(
      {
        lockScreen: <BasicLiveActivityUI />,
      },
      {
        activityId: 'basic',
        autoUpdate,
        autoStart,
        deepLinkUrl: '/voltraui/basic',
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

BasicLiveActivity.displayName = 'BasicLiveActivity'

export default BasicLiveActivity
export { BasicLiveActivityUI }
