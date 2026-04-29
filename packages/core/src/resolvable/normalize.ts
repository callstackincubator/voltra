import type {
  NormalizedResolvableCondition,
  NormalizedResolvableJsonValue,
  NormalizedResolvableValue,
} from './internal.js'
import { isResolvableExpression } from './public.js'
import type { ResolvableCondition, ResolvableExpression } from './public.js'

import { RESOLVABLE_SENTINEL_KEY } from './constants.js'

const isPlainObject = (value: unknown): value is Record<string, unknown> => {
  if (value === null || typeof value !== 'object') return false
  if (Array.isArray(value)) return false
  return Object.prototype.toString.call(value) === '[object Object]'
}

export const isResolvableCondition = (value: unknown): value is ResolvableCondition => {
  return (
    isResolvableExpression(value) &&
    (value.kind === 'eq' ||
      value.kind === 'ne' ||
      value.kind === 'and' ||
      value.kind === 'or' ||
      value.kind === 'not' ||
      value.kind === 'inList')
  )
}

const normalizeJsonLike = (value: unknown): NormalizedResolvableJsonValue => {
  if (value === null || typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
    return value
  }

  if (isResolvableExpression(value)) {
    if (isResolvableCondition(value)) {
      throw new Error('[Voltra] Resolvable conditions can only be used inside when() or other condition builders.')
    }

    return normalizeResolvableValue(value)
  }

  if (Array.isArray(value)) {
    return value.map((item) => normalizeJsonLike(item))
  }

  if (isPlainObject(value)) {
    if (RESOLVABLE_SENTINEL_KEY in value) {
      throw new Error(`[Voltra] Object key "${RESOLVABLE_SENTINEL_KEY}" is reserved for serialized resolvable values.`)
    }

    const normalized: Record<string, NormalizedResolvableJsonValue> = {}
    for (const [key, nestedValue] of Object.entries(value)) {
      if (nestedValue !== undefined) {
        normalized[key] = normalizeJsonLike(nestedValue)
      }
    }
    return normalized
  }

  throw new Error(`[Voltra] Unsupported resolvable payload value of type "${typeof value}".`)
}

export const normalizeCondition = (condition: ResolvableCondition): NormalizedResolvableCondition => {
  switch (condition.kind) {
    case 'eq':
    case 'ne':
      return {
        type: condition.kind,
        left: normalizeJsonLike(condition.left),
        right: normalizeJsonLike(condition.right),
      }
    case 'and':
    case 'or':
      return {
        type: condition.kind,
        conditions: condition.conditions.map((entry) => normalizeCondition(entry)),
      }
    case 'not':
      return {
        type: 'not',
        condition: normalizeCondition(condition.condition),
      }
    case 'inList':
      return {
        type: 'inList',
        value: normalizeJsonLike(condition.value),
        values: condition.values.map((entry) => normalizeJsonLike(entry)),
      }
  }
}

export const normalizeResolvableValue = (value: ResolvableExpression<unknown>): NormalizedResolvableValue => {
  switch (value.kind) {
    case 'env':
      return {
        type: 'env',
        key: value.key,
      }
    case 'when':
      return {
        type: 'when',
        condition: normalizeCondition(value.condition),
        thenValue: normalizeJsonLike(value.thenValue),
        elseValue: normalizeJsonLike(value.elseValue),
      }
    case 'match':
      return {
        type: 'match',
        value: normalizeJsonLike(value.value),
        cases: Object.fromEntries(
          Object.entries(value.cases).map(([key, caseValue]) => [key, normalizeJsonLike(caseValue)])
        ),
      }
  }
}

export const normalizeResolvableJsonValue = (value: unknown): NormalizedResolvableJsonValue => normalizeJsonLike(value)
