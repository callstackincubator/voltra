import { VoltraTextStyleProp } from '../styles/types.js'
import { createVoltraComponent } from './createVoltraComponent.js'
import type { LabelProps as SwiftLabelProps } from './props/Label.js'

export type LabelProps = Omit<SwiftLabelProps, 'style'> & {
  style?: VoltraTextStyleProp
}
export const Label = createVoltraComponent<LabelProps>('Label')
