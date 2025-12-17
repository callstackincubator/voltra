export type DismissalPolicy = 'immediate' | { after: number }

export type VoltraPropValue = string | number | boolean | null | VoltraNodeJson // Allow component trees in props

export type VoltraElementJson = {
  t: number
  i?: string
  c?: VoltraNodeJson
  p?: Record<string, VoltraPropValue>
}

/**
 * Reference to a shared element by index.
 * Used for element deduplication - when the same JSX element (by reference)
 * appears multiple times in the tree.
 */
export type VoltraElementRef = {
  $r: number
}

export type VoltraNodeJson = VoltraElementJson | VoltraElementJson[] | VoltraElementRef | string

export type VoltraVariantsJson = {
  v: number // Payload version - required for remote updates
  s?: Record<string, unknown>[] // Shared stylesheet for all variants
  e?: VoltraNodeJson[] // Shared elements for deduplication
  ls?: VoltraNodeJson
  ls_background_tint?: string
  isl_keyline_tint?: string
  isl_exp_c?: VoltraNodeJson
  isl_exp_l?: VoltraNodeJson
  isl_exp_t?: VoltraNodeJson
  isl_exp_b?: VoltraNodeJson
  isl_cmp_l?: VoltraNodeJson
  isl_cmp_t?: VoltraNodeJson
  isl_min?: VoltraNodeJson
}

export type VoltraJson = VoltraVariantsJson
