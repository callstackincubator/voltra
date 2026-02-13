import { createElement } from 'react'
import type { ChartDataPoint } from './chart-types.js'
import { VOLTRA_MARK_TAG } from './BarMark.js'

export type LineMarkProps = {
  data: ChartDataPoint[]
  color?: string
  interpolation?: 'linear' | 'monotone' | 'stepStart' | 'stepEnd' | 'stepCenter' | 'cardinal' | 'catmullRom'
  lineWidth?: number
  symbol?: string
}

export const LineMark = (props: LineMarkProps) => createElement('VoltraLineMark', props as any)
LineMark.displayName = 'LineMark'
LineMark[VOLTRA_MARK_TAG] = 'line' as const
