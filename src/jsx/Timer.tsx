import { createVoltraComponent } from './createVoltraComponent'
import type { TimerProps } from './props/Timer'

export type { TimerProps }
export const Timer = createVoltraComponent<TimerProps>('Timer')
