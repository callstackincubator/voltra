import type { ReactNode } from 'react'
import type { ResolvableCondition } from '@use-voltra/core'
import { createVoltraComponent } from './createVoltraComponent.js'

export type ControlIfProps = {
  id?: string
  condition: ResolvableCondition
  children?: ReactNode
  else?: ReactNode
}

export const ControlIf = createVoltraComponent<ControlIfProps>('ControlIf')
