import { createElement } from 'react'

import { VOLTRA_MARK_TAG } from '../../jsx/BarMark.js'
import type { ChartDataPoint } from './chart-types.js'

export type PointMarkProps = {
  data: ChartDataPoint[]
  color?: string
  symbol?: string
  symbolSize?: number
}

export const PointMark = (props: PointMarkProps) => createElement('VoltraPointMark', props as any)
PointMark.displayName = 'PointMark'
PointMark[VOLTRA_MARK_TAG] = 'point' as const
