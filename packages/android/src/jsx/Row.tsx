import { createVoltraComponent } from './createVoltraComponent.js'
import type { AndroidRowProps as RowProps } from './props/AndroidRow.js'

export type { RowProps }
export const Row = createVoltraComponent<RowProps>('AndroidRow')
