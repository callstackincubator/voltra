import { createVoltraComponent } from './createVoltraComponent.js'
import type { AndroidSpacerProps as SpacerProps } from './props/AndroidSpacer.js'

export type { SpacerProps }
export const Spacer = createVoltraComponent<SpacerProps>('AndroidSpacer')
