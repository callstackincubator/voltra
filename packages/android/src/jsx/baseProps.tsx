import type { NativeModifiersProp } from '@use-voltra/core'
import { ReactNode } from 'react'

import type { AndroidModifier } from '../modifiers/createAndroidModifier.js'
import type { VoltraAndroidStyleProp } from '../styles/types.js'

export type VoltraAndroidBaseProps = {
  id?: string
  deepLinkUrl?: string
  style?: VoltraAndroidStyleProp
  /**
   * Jetpack Glance modifiers from `VoltraAndroid.modifiers`, applied after `style`. Glance
   * ignores their order, except that repeated `padding` adds up. Falsy entries, such as
   * `count && modifier` with `count = 0`, mean no modifier.
   */
  modifiers?: NativeModifiersProp<AndroidModifier>
  children?: ReactNode
}

/** Alias used by generated `props/*.ts` component types */
export type VoltraBaseProps = VoltraAndroidBaseProps
