import { createElement } from 'react'

import type { AndroidColorValue } from '../dynamic-colors.js'
import { VOLTRA_MARK_TAG } from './BarMark.js'
import type { ChartDataPoint } from './chart-types.js'

export type PointMarkProps = {
  data: ChartDataPoint[]
  color?: AndroidColorValue
  symbol?: string
  symbolSize?: number
}

export const PointMark = (props: PointMarkProps) => createElement('VoltraPointMark', props as any)
PointMark.displayName = 'PointMark'
PointMark[VOLTRA_MARK_TAG] = 'point' as const
