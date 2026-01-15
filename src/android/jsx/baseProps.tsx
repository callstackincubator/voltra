import { ReactNode } from 'react'

import type { VoltraAndroidStyleProp } from '../styles/types.js'

export type VoltraAndroidBaseProps = {
  id?: string
  deepLinkUrl?: string
  style?: VoltraAndroidStyleProp
  children?: ReactNode
}
