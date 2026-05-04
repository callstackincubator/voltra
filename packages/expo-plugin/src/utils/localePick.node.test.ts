import { pickLocalizedValue } from './localePick'

describe('pickLocalizedValue', () => {
  it('prefers exact locale tag match', () => {
    const out = pickLocalizedValue(
      { en: '{"a":1}', pl: '{"a":2}', 'pt-BR': '{"a":3}' },
      ['pt-BR', 'en']
    )
    expect(out).toBe('{"a":3}')
  })

  it('falls back to language-only match', () => {
    const out = pickLocalizedValue({ en: 'en', pl: 'pl' }, ['pl-PL'])
    expect(out).toBe('pl')
  })

  it('uses en then __default then first sorted key', () => {
    expect(pickLocalizedValue({ de: 'de', en: 'en' }, ['fr'])).toBe('en')
    expect(pickLocalizedValue({ __default: 'd', pl: 'pl' }, ['fr'])).toBe('d')
    expect(pickLocalizedValue({ zz: 'z', aa: 'a' }, ['fr'])).toBe('a')
  })
})
