import { getDynamicLiveActivityAttributesType as getCoreAttributesType } from '../../core/src/dynamic-live-activity'
import { getDynamicLiveActivityAttributesType as getIOSAttributesType } from '../../ios/src/live-activity/dynamic'

import { getDynamicLiveActivityAttributesType as getExpoPluginAttributesType } from './dynamic-live-activity'

describe('Dynamic Live Activity attributes type naming', () => {
  it.each([
    ['', 'VoltraLiveActivityAttributes'],
    ['order_finished', 'VoltraOrderFinishedLiveActivityAttributes'],
    ['order__finished', 'VoltraOrderFinishedLiveActivityAttributes'],
    ['_driver_arrived_', 'VoltraDriverArrivedLiveActivityAttributes'],
    ['alreadyCamel', 'VoltraAlreadyCamelLiveActivityAttributes'],
  ])('keeps core, Expo generation, and the iOS public helper aligned for %p', (definitionId, expected) => {
    expect(getCoreAttributesType(definitionId)).toBe(expected)
    expect(getExpoPluginAttributesType(definitionId)).toBe(expected)
    expect(getIOSAttributesType(definitionId)).toBe(expected)
  })
})
