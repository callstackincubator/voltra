export const RESOLVABLE_SENTINEL_KEY = '$rv'

export const RESOLVABLE_ENV_IDS = {
  renderingMode: 0,
  showsWidgetContainerBackground: 1,
} as const

export const RESOLVABLE_VALUE_OPCODES = {
  env: 0,
  when: 1,
  match: 2,
} as const

export const RESOLVABLE_CONDITION_OPCODES = {
  eq: 0,
  ne: 1,
  and: 2,
  or: 3,
  not: 4,
  inList: 5,
} as const
