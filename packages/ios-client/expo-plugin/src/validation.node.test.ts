import { validateIOSConfigPluginProps } from './validation'

describe('validateIOSConfigPluginProps', () => {
  it('accepts valid groupIdentifier', () => {
    expect(() =>
      validateIOSConfigPluginProps({
        groupIdentifier: 'group.com.example.app',
      })
    ).not.toThrow()
  })

  it('rejects groupIdentifier without group. prefix', () => {
    expect(() =>
      validateIOSConfigPluginProps({
        groupIdentifier: 'com.example.app',
      })
    ).toThrow(/must start with 'group.'/)
  })
})
