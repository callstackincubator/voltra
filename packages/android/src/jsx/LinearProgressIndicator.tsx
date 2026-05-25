import { createVoltraComponent } from './createVoltraComponent.js'
import type { AndroidLinearProgressIndicatorProps as LinearProgressIndicatorProps } from './props/AndroidLinearProgressIndicator.js'

export type { LinearProgressIndicatorProps }
export const LinearProgressIndicator = createVoltraComponent<LinearProgressIndicatorProps>(
  'AndroidLinearProgressIndicator'
)
