import type { ActivityFamily, LiveActivityConfig } from '../types'

const VALID_ACTIVITY_FAMILIES: Set<ActivityFamily> = new Set(['small'])

/**
 * Validates a Live Activity configuration.
 * Throws an error if validation fails.
 */
export function validateLiveActivityConfig(config: LiveActivityConfig | undefined): void {
  if (!config) return

  // Validate supplemental families if provided
  if (config.supplementalActivityFamilies) {
    if (!Array.isArray(config.supplementalActivityFamilies)) {
      throw new Error('liveActivity.supplementalActivityFamilies must be an array')
    }

    if (config.supplementalActivityFamilies.length === 0) {
      throw new Error(
        'liveActivity.supplementalActivityFamilies cannot be empty. ' +
          'Either provide families or remove the property to disable supplemental activity families.'
      )
    }

    for (const family of config.supplementalActivityFamilies) {
      if (!VALID_ACTIVITY_FAMILIES.has(family)) {
        throw new Error(
          `Invalid activity family '${family}'. ` +
            `Valid families are: ${Array.from(VALID_ACTIVITY_FAMILIES).join(', ')}`
        )
      }
    }
  }
}
