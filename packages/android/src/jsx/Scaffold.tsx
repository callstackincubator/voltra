import { createVoltraComponent } from './createVoltraComponent.js'
import type { ScaffoldProps } from './props/Scaffold.js'

export type { ScaffoldProps }
export const Scaffold = createVoltraComponent<ScaffoldProps>('AndroidScaffold')
