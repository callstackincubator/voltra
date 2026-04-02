export type VoltraPropValue = string | number | boolean | null | VoltraNodeJson

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
