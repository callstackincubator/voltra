import { createVoltraComponent } from './createVoltraComponent.js'
import type { GaugeProps } from './props/Gauge.js'

export type { GaugeProps }
export const Gauge = createVoltraComponent<GaugeProps>('Gauge')
