import { ReactNode } from 'react'

import type { VoltraStyleProp } from '../styles/index.js'

export type VoltraBaseProps = {
  id?: string
  style?: VoltraStyleProp
  children?: ReactNode
}
