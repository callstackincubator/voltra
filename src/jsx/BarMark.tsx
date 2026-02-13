import { createElement } from 'react'
import type { ChartDataPoint } from './chart-types.js'

export const VOLTRA_MARK_TAG = Symbol.for('VOLTRA_MARK_TAG')

export type BarMarkProps = {
  data: ChartDataPoint[]
  color?: string
  stacking?: 'standard' | 'normalized' | 'unstacked' | 'grouped'
  cornerRadius?: number
  width?: number
}

export const BarMark = (props: BarMarkProps) => createElement('VoltraBarMark', props as any)
BarMark.displayName = 'BarMark'
BarMark[VOLTRA_MARK_TAG] = 'bar' as const
