import { createVoltraComponent } from './createVoltraComponent.js'
import type { SymbolProps } from './props/Symbol.js'

export type { SymbolProps }
export const Symbol = createVoltraComponent<SymbolProps>('Symbol')
