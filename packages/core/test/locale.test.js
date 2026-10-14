const test = require('node:test')
const assert = require('node:assert/strict')

const { localeCandidates, pickLocalizedValue, resolveLocale } = require('../build/cjs/locale.js')

test('pickLocalizedValue prefers an exact tag, then the language', () => {
  assert.equal(pickLocalizedValue({ en: 'en', pl: 'pl', 'pt-BR': 'br' }, ['pt-BR', 'en']), 'br')
  assert.equal(pickLocalizedValue({ en: 'en', pl: 'pl' }, ['pl-PL']), 'pl')
})

test('pickLocalizedValue falls back to en, then __default, then the first sorted key', () => {
  assert.equal(pickLocalizedValue({ de: 'de', en: 'en' }, ['fr']), 'en')
  assert.equal(pickLocalizedValue({ __default: 'd', pl: 'pl' }, ['fr']), 'd')
  assert.equal(pickLocalizedValue({ zz: 'z', aa: 'a' }, ['fr']), 'a')
  assert.equal(pickLocalizedValue({}, ['fr']), undefined)
})

test('pickLocalizedValue skips empty values and accepts non-string values', () => {
  assert.equal(pickLocalizedValue({ pl: '', en: 'en' }, ['pl']), 'en')
  assert.deepEqual(pickLocalizedValue({ pl: { title: 'Pogoda' } }, ['pl-PL']), { title: 'Pogoda' })
})

test('localeCandidates orders appLocale, preferredLanguages, then locale without duplicates', () => {
  assert.deepEqual(localeCandidates({ appLocale: 'pl', preferredLanguages: ['de-CH', 'PL'], locale: 'de-CH' }), [
    'pl',
    'de-CH',
  ])
  assert.deepEqual(localeCandidates({ locale: 'en-US' }), ['en-US'])
})

test('resolveLocale gives the app override precedence', () => {
  const env = { appLocale: 'pl', preferredLanguages: ['de-CH', 'fr'], locale: 'de-CH' }
  assert.equal(resolveLocale(env, ['de', 'fr', 'pl']), 'pl')
})

test('resolveLocale walks the preferred languages from region to language', () => {
  const env = { preferredLanguages: ['de-CH', 'fr-FR'], locale: 'en-US' }
  assert.equal(resolveLocale(env, ['fr', 'de']), 'de')
  assert.equal(resolveLocale(env, ['fr', 'it']), 'fr')
  assert.equal(resolveLocale(env, ['it', 'en']), 'en')
})

test('resolveLocale accepts a messages object keyed by language', () => {
  const messages = { en: { title: 'Weather' }, pl: { title: 'Pogoda' } }
  const env = { preferredLanguages: ['pl-PL'], locale: 'en-PL' }
  assert.equal(messages[resolveLocale(env, messages)].title, 'Pogoda')
  assert.equal(resolveLocale(env, {}), undefined)
})

test('resolveLocale tolerates ICU-style tags', () => {
  assert.equal(resolveLocale({ locale: 'pt_BR' }, ['pt-PT', 'pt-BR']), 'pt-BR')
})
