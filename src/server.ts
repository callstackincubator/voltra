import { ensurePayloadWithinBudget } from './payload'
import { renderVoltraToString as render, type VoltraVariants } from './renderer'

export * as Voltra from './jsx/primitives'
export type { VoltraVariants } from './renderer'

export const renderVoltraToString = (variants: VoltraVariants): string => {
  const result = render(variants)
  ensurePayloadWithinBudget(result)

  return result
}
