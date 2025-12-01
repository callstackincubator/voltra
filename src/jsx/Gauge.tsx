import { createVoltraComponent } from './createVoltraComponent'
import type { GaugeProps } from './props/Gauge'

export type { GaugeProps }
export const Gauge = createVoltraComponent<GaugeProps>('Gauge')
