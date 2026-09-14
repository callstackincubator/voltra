import { ReactNode } from 'react'

import type { IosModifier } from '../modifiers/createIosModifier.js'
import type { VoltraStyleProp } from '../styles/index.js'

export type VoltraBaseProps = {
  id?: string
  style?: VoltraStyleProp
  /**
   * SwiftUI modifiers from `Voltra.modifiers`, applied on top of the styled component in array
   * order: the first entry is innermost.
   */
  modifiers?: readonly IosModifier[]
  children?: ReactNode
}
