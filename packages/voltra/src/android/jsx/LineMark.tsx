import { createElement } from 'react'

import { VOLTRA_MARK_TAG } from '../../jsx/BarMark.js'
import type { AndroidColorValue } from '../dynamic-colors.js'
import type { ChartDataPoint } from './chart-types.js'

export type LineMarkProps = {
  data: ChartDataPoint[]
  color?: AndroidColorValue
  interpolation?: 'linear' | 'monotone' | 'stepStart' | 'stepEnd' | 'stepCenter' | 'cardinal' | 'catmullRom'
  lineWidth?: number
  symbol?: string
}

export const LineMark = (props: LineMarkProps) => createElement('VoltraLineMark', props as any)
LineMark.displayName = 'LineMark'
LineMark[VOLTRA_MARK_TAG] = 'line' as const
