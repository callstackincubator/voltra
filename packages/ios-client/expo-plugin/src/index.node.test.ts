import type { ExpoConfig } from 'expo/config'

import withVoltraIos from './index'

function createConfig(overrides: Partial<ExpoConfig> = {}): ExpoConfig {
  return {
    name: 'voltraexample',
    slug: 'voltraexample',
    // withPlugins asserts an expo-cli-provided project root when registering plugins.
    _internal: { projectRoot: '/tmp/voltra-example' },
    ...overrides,
  }
}

describe('withVoltraIos', () => {
  it('throws an actionable error when ios.bundleIdentifier is missing', () => {
    expect(() => withVoltraIos(createConfig(), {})).toThrow(/expo\.ios\.bundleIdentifier/)
    expect(() => withVoltraIos(createConfig({ ios: {} }), {})).toThrow(/app\.json or app\.config/)
  })

  it('does not throw when ios.bundleIdentifier is set', () => {
    const config = createConfig({ ios: { bundleIdentifier: 'com.voltra.example' } })
    expect(() => withVoltraIos(config, {})).not.toThrow()
  })
})
