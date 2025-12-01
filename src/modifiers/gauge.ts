// 🤖 AUTO-GENERATED from data/modifiers.json
// DO NOT EDIT MANUALLY - Changes will be overwritten
// Schema version: 1.0.0

import type { Modifier } from './types'
/**
 * Sets the style of a gauge
 * @availability iOS 16.0, macOS 13.0, tvOS 16.0, watchOS 9.0
 */
export type GaugeStyleModifier = Modifier<
  'gaugeStyle',
  {
    /** The gauge style to apply */
    style: 'accessoryCircular' | 'accessoryLinear' | 'linearCapacity' | 'automatic'
  }
>
export type GaugeModifiers =
  | GaugeStyleModifier
