/**
 * A value that is either shared by every Xcode build configuration, or given once per build
 * configuration name for apps that ship several environments from the same project.
 *
 * ```ts
 * groupIdentifier: 'group.com.example.app'
 * groupIdentifier: { Debug: 'group.com.example.app.dev', Release: 'group.com.example.app' }
 * ```
 */
export type PerConfiguration<TValue> = TValue | Record<string, TValue>

export function isPerConfigurationMap<TValue>(
  value: PerConfiguration<TValue> | undefined
): value is Record<string, TValue> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

/**
 * Pairs a per-build-configuration value with the project's real build configurations, in the
 * project's own order. Keys that name no build configuration, and build configurations the value
 * does not cover, are reported before anything is written to the project.
 */
export function getValuesByBuildConfiguration<TValue>(
  value: Record<string, TValue>,
  buildConfigurationNames: string[],
  context: string,
  createError: (message: string) => Error
): Map<string, TValue> {
  const knownNames = `This project has: ${buildConfigurationNames.join(', ')}.`
  const unknownNames = Object.keys(value).filter((name) => !buildConfigurationNames.includes(name))

  if (unknownNames.length > 0) {
    throw createError(`${context} names unknown build configurations: ${unknownNames.join(', ')}. ${knownNames}`)
  }

  const valuesByBuildConfiguration = new Map<string, TValue>()

  for (const buildConfigurationName of buildConfigurationNames) {
    const configurationValue = value[buildConfigurationName]

    if (configurationValue === undefined) {
      throw createError(`${context} has no value for build configuration '${buildConfigurationName}'. ${knownNames}`)
    }

    valuesByBuildConfiguration.set(buildConfigurationName, configurationValue)
  }

  return valuesByBuildConfiguration
}
