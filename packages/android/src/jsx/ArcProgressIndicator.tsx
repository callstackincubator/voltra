import { createVoltraComponent } from './createVoltraComponent.js'
import type { AndroidArcProgressIndicatorProps as GeneratedArcProgressIndicatorProps } from './props/AndroidArcProgressIndicator.js'

export type ArcProgressIndicatorProps = Omit<GeneratedArcProgressIndicatorProps, 'gradientColors'> & {
  /** Sweep gradient colors along the filled arc, from `startAngle`. Overrides `color`. */
  gradientColors?: string[]
}

export const ArcProgressIndicator = createVoltraComponent<ArcProgressIndicatorProps>('AndroidArcProgressIndicator', {
  toJSON: ({ gradientColors, ...rest }) => {
    const result: Record<string, unknown> = { ...rest }
    if (gradientColors != null) {
      result.gradientColors = JSON.stringify(gradientColors)
    }
    return result
  },
})
