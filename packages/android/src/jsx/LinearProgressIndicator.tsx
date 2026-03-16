import { createVoltraComponent } from './createVoltraComponent.js'
import type { LinearProgressIndicatorProps } from './props/LinearProgressIndicator.js'

export type { LinearProgressIndicatorProps }
export const LinearProgressIndicator = createVoltraComponent<LinearProgressIndicatorProps>(
  'AndroidLinearProgressIndicator'
)
