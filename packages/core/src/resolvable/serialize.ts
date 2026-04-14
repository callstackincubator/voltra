import { shorten } from '../payload/short-names.js'
import type {
  VoltraPropValue,
  VoltraResolvableConditionTuple,
  VoltraResolvableValueTuple,
  VoltraSerializableValue,
  VoltraWrappedResolvableValue,
} from '../types.js'
import { flattenStyle } from '../renderer/flatten-styles.js'
import {
  RESOLVABLE_CONDITION_OPCODES,
  RESOLVABLE_ENV_IDS,
  RESOLVABLE_SENTINEL_KEY,
  RESOLVABLE_VALUE_OPCODES,
} from './constants.js'
import type {
  NormalizedResolvableCondition,
  NormalizedResolvableJsonValue,
  NormalizedResolvableValue,
} from './internal.js'
import { isResolvableExpression } from './public.js'
import type { ResolvableExpression } from './public.js'
import { normalizeResolvableJsonValue, normalizeResolvableValue } from './normalize.js'

const serializeConditionTuple = (condition: NormalizedResolvableCondition): VoltraResolvableConditionTuple => {
  switch (condition.type) {
    case 'eq':
      return [
        RESOLVABLE_CONDITION_OPCODES.eq,
        serializeNormalizedJsonValue(condition.left),
        serializeNormalizedJsonValue(condition.right),
      ]
    case 'ne':
      return [
        RESOLVABLE_CONDITION_OPCODES.ne,
        serializeNormalizedJsonValue(condition.left),
        serializeNormalizedJsonValue(condition.right),
      ]
    case 'and':
      return [RESOLVABLE_CONDITION_OPCODES.and, condition.conditions.map((entry) => serializeConditionTuple(entry))]
    case 'or':
      return [RESOLVABLE_CONDITION_OPCODES.or, condition.conditions.map((entry) => serializeConditionTuple(entry))]
    case 'not':
      return [RESOLVABLE_CONDITION_OPCODES.not, serializeConditionTuple(condition.condition)]
    case 'inList':
      return [
        RESOLVABLE_CONDITION_OPCODES.inList,
        serializeNormalizedJsonValue(condition.value),
        condition.values.map((entry) => serializeNormalizedJsonValue(entry)),
      ]
  }
}

const wrapResolvableTuple = (tuple: VoltraResolvableValueTuple): VoltraWrappedResolvableValue => ({
  [RESOLVABLE_SENTINEL_KEY]: tuple,
})

const isNormalizedResolvableValue = (value: NormalizedResolvableJsonValue): value is NormalizedResolvableValue => {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    return false
  }

  return 'type' in value && (value.type === 'env' || value.type === 'when' || value.type === 'match')
}

const isResolvableCondition = (value: unknown): boolean => {
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

const isResolvableValueExpression = (value: unknown): value is ResolvableExpression<unknown> => {
  return isResolvableExpression(value) && !isResolvableCondition(value)
}

const serializeResolvableTuple = (value: NormalizedResolvableValue): VoltraResolvableValueTuple => {
  switch (value.type) {
    case 'env':
      return [RESOLVABLE_VALUE_OPCODES.env, RESOLVABLE_ENV_IDS[value.key]]
    case 'when':
      return [
        RESOLVABLE_VALUE_OPCODES.when,
        serializeConditionTuple(value.condition),
        serializeNormalizedJsonValue(value.thenValue),
        serializeNormalizedJsonValue(value.elseValue),
      ]
    case 'match':
      return [
        RESOLVABLE_VALUE_OPCODES.match,
        serializeNormalizedJsonValue(value.value),
        Object.fromEntries(
          Object.entries(value.cases).map(([key, caseValue]) => [key, serializeNormalizedJsonValue(caseValue)])
        ),
      ]
  }
}

const serializeNormalizedJsonValue = (value: NormalizedResolvableJsonValue): VoltraSerializableValue => {
  if (value === null || typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
    return value
  }

  if (Array.isArray(value)) {
    return value.map((entry) => serializeNormalizedJsonValue(entry))
  }

  if (isNormalizedResolvableValue(value)) {
    return wrapResolvableTuple(serializeResolvableTuple(value))
  }

  const serialized: Record<string, VoltraSerializableValue> = {}
  for (const [key, nestedValue] of Object.entries(value)) {
    serialized[key] = serializeNormalizedJsonValue(nestedValue)
  }
  return serialized
}

export const serializeResolvablePropValue = (value: unknown): VoltraPropValue => {
  const normalized = isResolvableValueExpression(value)
    ? normalizeResolvableValue(value)
    : normalizeResolvableJsonValue(value)

  return serializeNormalizedJsonValue(normalized) as VoltraPropValue
}

export const serializeStyleObject = (style: unknown): VoltraSerializableValue => {
  if (style === null || style === undefined) {
    return style as null
  }

  const flattened = flattenStyle(style as never)
  if (flattened === null || flattened === undefined) {
    return null
  }

  const serialized: Record<string, VoltraSerializableValue> = {}

  for (const [key, value] of Object.entries(flattened as Record<string, unknown>)) {
    if (value === null || value === undefined) {
      continue
    }

    serialized[shorten(key)] = serializeResolvablePropValue(value) as VoltraSerializableValue
  }

  return serialized
}
