import { createVoltraComponent } from '../../jsx/createVoltraComponent.js'
import type { CircularProgressIndicatorProps } from './props/CircularProgressIndicator.js'

export type { CircularProgressIndicatorProps }
export const CircularProgressIndicator = createVoltraComponent<CircularProgressIndicatorProps>(
  'AndroidCircularProgressIndicator'
)
