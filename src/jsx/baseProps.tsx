import { ReactNode } from 'react'

import type { VoltraModifier } from '../modifiers'
import type { VoltraStyleProp } from '../styles'

export type VoltraBaseProps = {
  id?: string
  style?: VoltraStyleProp
  modifiers?: VoltraModifier[]
  children?: ReactNode
}
