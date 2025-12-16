export type DismissalPolicy = 'immediate' | { after: number }

export type VoltraPropValue = string | number | boolean | null | VoltraNodeJson // Allow component trees in props

export type VoltraElementJson = {
  t: number
  i?: string
  c?: VoltraNodeJson
  p: Record<string | number, VoltraPropValue>
}

export type VoltraNodeJson = VoltraElementJson | VoltraElementJson[] | string

export type VoltraVariantsJson = {
  ls?: VoltraNodeJson
  ls_s?: Record<string, unknown>[] // Stylesheet for lockScreen
  ls_background_tint?: string
  isl_keyline_tint?: string
  isl_exp_c?: VoltraNodeJson
  isl_exp_c_s?: Record<string, unknown>[] // Stylesheet for island expanded center
  isl_exp_l?: VoltraNodeJson
  isl_exp_l_s?: Record<string, unknown>[] // Stylesheet for island expanded leading
  isl_exp_t?: VoltraNodeJson
  isl_exp_t_s?: Record<string, unknown>[] // Stylesheet for island expanded trailing
  isl_exp_b?: VoltraNodeJson
  isl_exp_b_s?: Record<string, unknown>[] // Stylesheet for island expanded bottom
  isl_cmp_l?: VoltraNodeJson
  isl_cmp_l_s?: Record<string, unknown>[] // Stylesheet for island compact leading
  isl_cmp_t?: VoltraNodeJson
  isl_cmp_t_s?: Record<string, unknown>[] // Stylesheet for island compact trailing
  isl_min?: VoltraNodeJson
  isl_min_s?: Record<string, unknown>[] // Stylesheet for island minimal
}

export type VoltraJson = VoltraVariantsJson
