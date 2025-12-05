export type VoltraElementJson = {
  t: string
  i?: string
  c?: VoltraNodeJson
  p: Record<string, unknown>
}

export type VoltraNodeJson = VoltraElementJson | VoltraElementJson[] | string

export type VoltraVariantsJson = {
  ls?: VoltraNodeJson
  isl_exp_c?: VoltraNodeJson
  isl_exp_l?: VoltraNodeJson
  isl_exp_t?: VoltraNodeJson
  isl_exp_b?: VoltraNodeJson
  isl_cmp_l?: VoltraNodeJson
  isl_cmp_t?: VoltraNodeJson
  isl_min?: VoltraNodeJson
}

export type VoltraJson = VoltraVariantsJson
