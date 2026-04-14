export type VoltraJsonPrimitive = string | number | boolean | null

export type VoltraSerializableValue =
  | VoltraJsonPrimitive
  | VoltraSerializableValue[]
  | { [key: string]: VoltraSerializableValue }
  | VoltraWrappedResolvableValue

export type VoltraResolvableConditionTuple =
  | [0, VoltraSerializableValue, VoltraSerializableValue]
  | [1, VoltraSerializableValue, VoltraSerializableValue]
  | [2, VoltraResolvableConditionTuple[]]
  | [3, VoltraResolvableConditionTuple[]]
  | [4, VoltraResolvableConditionTuple]
  | [5, VoltraSerializableValue, VoltraSerializableValue[]]

export type VoltraResolvableValueTuple =
  | [0, 0 | 1]
  | [1, VoltraResolvableConditionTuple, VoltraSerializableValue, VoltraSerializableValue]
  | [2, VoltraSerializableValue, Record<string, VoltraSerializableValue>]

export type VoltraWrappedResolvableValue = {
  $rv: VoltraResolvableValueTuple
}

export type VoltraPropValue = VoltraSerializableValue | VoltraNodeJson

export type VoltraElementJson = {
  t: number
  i?: string
  c?: VoltraNodeJson
  p?: Record<string, VoltraPropValue>
}

export type VoltraElementRef = {
  $r: number
}

export type VoltraNodeJson = VoltraElementJson | VoltraElementJson[] | VoltraElementRef | string
