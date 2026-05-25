import { createVoltraComponent } from './createVoltraComponent.js'
import type { AndroidScaffoldProps as ScaffoldProps } from './props/AndroidScaffold.js'

export type { ScaffoldProps }
export const Scaffold = createVoltraComponent<ScaffoldProps>('AndroidScaffold')
