import { createElement } from 'react'
import type { ChartDataPoint } from './chart-types.js'
import { VOLTRA_MARK_TAG } from './BarMark.js'

export type AreaMarkProps = {
  data: ChartDataPoint[]
  color?: string
  interpolation?: 'linear' | 'monotone' | 'stepStart' | 'stepEnd' | 'stepCenter' | 'cardinal' | 'catmullRom'
  stacking?: 'standard' | 'normalized' | 'unstacked'
}

export const AreaMark = (props: AreaMarkProps) => createElement('VoltraAreaMark', props as any)
AreaMark.displayName = 'AreaMark'
AreaMark[VOLTRA_MARK_TAG] = 'area' as const
