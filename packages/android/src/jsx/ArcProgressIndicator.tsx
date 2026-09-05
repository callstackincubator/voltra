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
  validate: ({ children }) => {
    // The arc itself occupies one of the ten child slots a Glance Box allows.
    if (children.length > 9) {
      console.warn(
        `ArcProgressIndicator supports at most 9 direct children in Jetpack Glance, got ${children.length}. The arc itself takes the tenth slot, so extra children will be truncated.`
      )
    }
  },
})
