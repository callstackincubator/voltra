import { createElement } from 'react'

import { VOLTRA_MARK_TAG } from '../../jsx/BarMark.js'
import type { SectorDataPoint } from './chart-types.js'

export type SectorMarkProps = {
  data: SectorDataPoint[]
  color?: string
  innerRadius?: number
  outerRadius?: number
  angularInset?: number
}

export const SectorMark = (props: SectorMarkProps) => createElement('VoltraSectorMark', props as any)
SectorMark.displayName = 'SectorMark'
SectorMark[VOLTRA_MARK_TAG] = 'sector' as const
