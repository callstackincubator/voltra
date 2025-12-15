import { createVoltraComponent } from './createVoltraComponent'
import type { SymbolProps } from './props/Symbol'

export type { SymbolProps }
export const Symbol = createVoltraComponent<SymbolProps>('Symbol')
