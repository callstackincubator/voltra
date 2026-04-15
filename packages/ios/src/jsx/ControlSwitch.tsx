import type { ReactNode } from 'react'
import type { ResolvableValue } from '@use-voltra/core'
import { createVoltraComponent } from './createVoltraComponent.js'

export type ControlSwitchProps = {
  id?: string
  value: ResolvableValue<string | number | boolean | null>
  cases: Record<string, ReactNode> & { default?: ReactNode }
}

export const ControlSwitch = createVoltraComponent<ControlSwitchProps>('ControlSwitch')
