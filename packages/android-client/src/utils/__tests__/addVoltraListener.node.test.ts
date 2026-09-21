jest.mock('react-native', () => ({
  Platform: { OS: 'android' },
}))

import { Platform } from 'react-native'

import { addVoltraListener } from '../../events.js'

describe('addVoltraListener (Android client)', () => {
  afterEach(() => {
    jest.restoreAllMocks()
    ;(Platform as { OS: string }).OS = 'android'
  })

  it('warns and returns a no-op subscription for every platform', () => {
    for (const os of ['android', 'ios']) {
      ;(Platform as { OS: string }).OS = os
      const warn = jest.spyOn(console, 'warn').mockImplementation(() => {})

      const subscription = addVoltraListener('interaction', () => {})

      expect(warn).toHaveBeenCalledTimes(1)
      expect(warn).toHaveBeenCalledWith(
        "[Voltra] Event 'interaction' is only supported on iOS. Returning no-op subscription."
      )
      expect(typeof subscription.remove).toBe('function')
      expect(() => subscription.remove()).not.toThrow()
      warn.mockRestore()
    }
  })
})
