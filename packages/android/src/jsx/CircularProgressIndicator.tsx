import { createVoltraComponent } from './createVoltraComponent.js'
import type { AndroidCircularProgressIndicatorProps as CircularProgressIndicatorProps } from './props/AndroidCircularProgressIndicator.js'

export type { CircularProgressIndicatorProps }
export const CircularProgressIndicator = createVoltraComponent<CircularProgressIndicatorProps>(
  'AndroidCircularProgressIndicator'
)
