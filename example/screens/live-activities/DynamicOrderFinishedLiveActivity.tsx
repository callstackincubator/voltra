import React, { forwardRef, useEffect, useImperativeHandle, useState } from 'react'
import { useDynamicLiveActivity } from '@use-voltra/ios-client'

import { LiveActivityExampleComponent } from './types'

const DynamicOrderFinishedLiveActivity: LiveActivityExampleComponent = forwardRef(
  ({ autoUpdate = true, autoStart = false, onIsActiveChange }, ref) => {
    const [status, setStatus] = useState('Preparing your order')
    const { start, end, isActive } = useDynamicLiveActivity(
      'order_finished',
      { orderNumber: '123', status },
      { activityName: 'dynamic-order-123', autoStart, autoUpdate, deepLinkUrl: '/ios/activity' }
    )

    useEffect(() => {
      onIsActiveChange?.(isActive)
    }, [isActive, onIsActiveChange])

    useImperativeHandle(ref, () => ({
      start,
      update: () => {
        setStatus((current) => (current === 'Preparing your order' ? 'Ready for pickup' : 'Preparing your order'))
      },
      end,
    }))

    return null
  }
)

DynamicOrderFinishedLiveActivity.displayName = 'DynamicOrderFinishedLiveActivity'

export default DynamicOrderFinishedLiveActivity
