import { createVoltraComponent } from './createVoltraComponent.js'
import type { LinkProps } from './props/Link.js'

export type { LinkProps }
export const Link = createVoltraComponent<LinkProps>('Link')
