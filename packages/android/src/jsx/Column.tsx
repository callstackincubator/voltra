import { createVoltraComponent } from './createVoltraComponent.js'
import type { AndroidColumnProps as ColumnProps } from './props/AndroidColumn.js'

export type { ColumnProps }
export const Column = createVoltraComponent<ColumnProps>('AndroidColumn')
