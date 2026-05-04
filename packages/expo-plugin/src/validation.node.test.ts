import { validateInitialStatePath } from './validation'

describe('validateInitialStatePath', () => {
  it('accepts a plain path without projectRoot', () => {
    expect(() => validateInitialStatePath('./widgets/a.tsx', 'w')).not.toThrow()
  })

  it('accepts a locale map of paths', () => {
    expect(() =>
      validateInitialStatePath({ en: './widgets/en.tsx', pl: './widgets/pl.tsx' }, 'w')
    ).not.toThrow()
  })

  it('rejects empty locale map', () => {
    expect(() => validateInitialStatePath({} as any, 'w')).toThrow(/must not be empty/)
  })
})
