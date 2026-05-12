import { ensurePayloadWithinBudget } from '../payload'

describe('Payload Budget', () => {
  const EFFECTIVE_JSON_BUDGET = 3345

  test('1. Under budget', () => {
    const payload = 'a'.repeat(1000)
    expect(() => ensurePayloadWithinBudget(payload)).not.toThrow()
  })

  test('2. Exactly at budget', () => {
    const payload = 'a'.repeat(EFFECTIVE_JSON_BUDGET)
    expect(() => ensurePayloadWithinBudget(payload)).not.toThrow()
  })

  test('3. One byte over budget', () => {
    const payload = 'a'.repeat(EFFECTIVE_JSON_BUDGET + 1)
    expect(() => ensurePayloadWithinBudget(payload)).toThrow(/exceeds safe budget/)
  })

  test('4. Way over budget', () => {
    const payload = 'a'.repeat(10000)
    expect(() => ensurePayloadWithinBudget(payload)).toThrow(/10000B/)
  })

  test('5. Empty payload', () => {
    expect(() => ensurePayloadWithinBudget('{}')).not.toThrow()
  })

  test('6. Unicode content impact', () => {
    const safeEmojis = '😀'.repeat(836)
    expect(() => ensurePayloadWithinBudget(safeEmojis)).not.toThrow()

    const unsafeEmojis = '😀'.repeat(837)
    expect(() => ensurePayloadWithinBudget(unsafeEmojis)).toThrow()
  })

  test('7. Compression effectiveness', () => {})
})
