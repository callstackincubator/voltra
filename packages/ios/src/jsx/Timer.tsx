import { VoltraTextStyleProp } from '../styles/types.js'
import { createVoltraComponent } from './createVoltraComponent.js'
import type { TimerProps as SwiftTimerProps } from './props/Timer.js'

export type TimerProps = Omit<SwiftTimerProps, 'style'> & {
  style?: VoltraTextStyleProp
}
export const Timer = createVoltraComponent<TimerProps>('Timer')
