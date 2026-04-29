import type { ResolvableEnvironmentKey } from './public.js'

export type NormalizedResolvablePrimitive = string | number | boolean | null

export type NormalizedResolvableJsonValue =
  | NormalizedResolvablePrimitive
  | NormalizedResolvableJsonValue[]
  | { [key: string]: NormalizedResolvableJsonValue }
  | NormalizedResolvableValue

export type NormalizedResolvableCondition =
  | {
      type: 'eq' | 'ne'
      left: NormalizedResolvableJsonValue
      right: NormalizedResolvableJsonValue
    }
  | {
      type: 'and' | 'or'
      conditions: NormalizedResolvableCondition[]
    }
  | {
      type: 'not'
      condition: NormalizedResolvableCondition
    }
  | {
      type: 'inList'
      value: NormalizedResolvableJsonValue
      values: NormalizedResolvableJsonValue[]
    }

export type NormalizedResolvableValue =
  | {
      type: 'env'
      key: ResolvableEnvironmentKey
    }
  | {
      type: 'when'
      condition: NormalizedResolvableCondition
      thenValue: NormalizedResolvableJsonValue
      elseValue: NormalizedResolvableJsonValue
    }
  | {
      type: 'match'
      value: NormalizedResolvableJsonValue
      cases: Record<string, NormalizedResolvableJsonValue>
    }
