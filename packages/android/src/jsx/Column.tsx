import { createVoltraComponent } from './createVoltraComponent.js'
import type { ColumnProps } from './props/Column.js'

export type { ColumnProps }
export const Column = createVoltraComponent<ColumnProps>('AndroidColumn')
