import { VoltraTextStyleProp } from '../styles/types'
import { createVoltraComponent } from './createVoltraComponent'
import type { TimerProps as SwiftTimerProps } from './props/Timer'

export type TimerProps = Omit<SwiftTimerProps, 'style'> & {
  style?: VoltraTextStyleProp
}
export const Timer = createVoltraComponent<TimerProps>('Timer')
