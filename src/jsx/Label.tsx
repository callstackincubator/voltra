import { VoltraTextStyleProp } from '../styles/types'
import { createVoltraComponent } from './createVoltraComponent'
import type { LabelProps as SwiftLabelProps } from './props/Label'

export type LabelProps = Omit<SwiftLabelProps, 'style'> & {
  style?: VoltraTextStyleProp
}
export const Label = createVoltraComponent<LabelProps>('Label')
