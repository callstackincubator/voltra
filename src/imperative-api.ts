import { ensurePayloadWithinBudget } from './payload'
import { renderVoltraToString, VoltraVariants } from './renderer'
import { assertRunningOnApple } from './utils'
import VoltraUIModule from './VoltraUIModule'

export type StartVoltraOptions = {
  deepLinkUrl?: string
}

export const startVoltra = async (variants: VoltraVariants, options?: StartVoltraOptions): Promise<string> => {
  if (!assertRunningOnApple()) return Promise.resolve('')

  const payload = renderVoltraToString(variants)
  ensurePayloadWithinBudget(payload)

  const targetId = await VoltraUIModule.startVoltraUI(payload, {
    target: 'liveActivity',
    deepLinkUrl: options?.deepLinkUrl,
  })
  return targetId
}

export const updateVoltra = async (targetId: string, variants: VoltraVariants): Promise<void> => {
  if (!assertRunningOnApple()) return Promise.resolve()

  const payload = renderVoltraToString(variants)
  ensurePayloadWithinBudget(payload)

  return VoltraUIModule.updateVoltraUI(targetId, payload)
}

export const stopVoltra = async (targetId: string): Promise<void> => {
  if (!assertRunningOnApple()) return Promise.resolve()

  return VoltraUIModule.endVoltraUI(targetId)
}
