import type { ExpoConfig } from 'expo/config'

import { ensureURLScheme } from './urlScheme'

function createConfig(overrides: Partial<ExpoConfig> = {}): ExpoConfig {
  return {
    name: 'voltraexample',
    slug: 'voltraexample',
    ...overrides,
  }
}

function schemesOf(config: ExpoConfig): string[] {
  const types = (config.ios?.infoPlist?.CFBundleURLTypes as { CFBundleURLSchemes?: string[] }[] | undefined) ?? []

  return types.flatMap((type) => type.CFBundleURLSchemes ?? [])
}

describe('ensureURLScheme', () => {
  it('leaves CFBundleURLTypes unset so Expo withScheme can write it', () => {
    const config = ensureURLScheme(
      createConfig({ scheme: 'voltraexample', ios: { bundleIdentifier: 'com.voltra.example' } })
    )

    expect(config.ios?.infoPlist?.CFBundleURLTypes).toBeUndefined()
  })

  it('tops up a CFBundleURLTypes list the app owns with every configured scheme', () => {
    const config = ensureURLScheme(
      createConfig({
        scheme: ['voltraexample', 'voltraexample.debug'],
        ios: {
          bundleIdentifier: 'com.voltra.example',
          infoPlist: { CFBundleURLTypes: [{ CFBundleURLSchemes: ['fb123'] }] },
        },
      })
    )

    expect(schemesOf(config)).toEqual(['fb123', 'voltraexample', 'voltraexample.debug'])
  })

  it('reads ios.scheme and skips schemes already present', () => {
    const config = ensureURLScheme(
      createConfig({
        scheme: 'voltraexample',
        ios: {
          bundleIdentifier: 'com.voltra.example',
          scheme: 'voltraexample.ios',
          infoPlist: { CFBundleURLTypes: [{ CFBundleURLSchemes: ['voltraexample'] }] },
        },
      })
    )

    expect(schemesOf(config)).toEqual(['voltraexample', 'voltraexample.ios'])
  })

  it('falls back to the bundle identifier when no scheme is configured', () => {
    const config = ensureURLScheme(
      createConfig({
        ios: {
          bundleIdentifier: 'com.voltra.example',
          infoPlist: { CFBundleURLTypes: [{ CFBundleURLSchemes: ['fb123'] }] },
        },
      })
    )

    expect(schemesOf(config)).toEqual(['fb123', 'com.voltra.example'])
  })
})
