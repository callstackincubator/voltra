import { ensurePayloadWithinBudget } from './payload'
import { renderVoltraToString, VoltraVariants } from './renderer'
import { assertRunningOnApple } from './utils'
import VoltraModule from './VoltraModule'

export type StartVoltraOptions = {
  deepLinkUrl?: string
}

export const startVoltra = async (variants: VoltraVariants, options?: StartVoltraOptions): Promise<string> => {
  if (!assertRunningOnApple()) return Promise.resolve('')

  const payload = renderVoltraToString(variants)
  ensurePayloadWithinBudget(payload)

  const targetId = await VoltraModule.startVoltra(payload, {
    target: 'liveActivity',
    deepLinkUrl: options?.deepLinkUrl,
  })
  return targetId
}

export const updateVoltra = async (targetId: string, variants: VoltraVariants): Promise<void> => {
  if (!assertRunningOnApple()) return Promise.resolve()

  const payload = renderVoltraToString(variants)
  ensurePayloadWithinBudget(payload)

  return VoltraModule.updateVoltra(targetId, payload)
}

export const stopVoltra = async (targetId: string): Promise<void> => {
  if (!assertRunningOnApple()) return Promise.resolve()

  return VoltraModule.endVoltra(targetId)
}
