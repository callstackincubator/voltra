import { createElement } from 'react'

import { VOLTRA_MARK_TAG } from '../../jsx/BarMark.js'
import type { AndroidColorValue } from '../dynamic-colors.js'

export type RuleMarkProps = {
  xValue?: string | number
  yValue?: number
  color?: AndroidColorValue
  lineWidth?: number
}

export const RuleMark = (props: RuleMarkProps) => createElement('VoltraRuleMark', props as any)
RuleMark.displayName = 'RuleMark'
RuleMark[VOLTRA_MARK_TAG] = 'rule' as const
