declare const ANDROID_MODIFIER_BRAND: unique symbol

/**
 * A Jetpack Glance modifier descriptor produced by a `VoltraAndroid.modifiers` factory. The brand
 * exists only in the type system, so an iOS modifier cannot be passed to a `VoltraAndroid`
 * component.
 */
export type AndroidModifier = {
  readonly $type: string
  readonly [ANDROID_MODIFIER_BRAND]: 'android'
}

export const createAndroidModifier = <Params extends Record<string, unknown>>(
  type: string,
  params?: Params
): AndroidModifier & Readonly<Params> =>
  // Omitted options stay out of the descriptor instead of appearing as `undefined` keys.
  Object.freeze({
    ...Object.fromEntries(Object.entries(params ?? {}).filter(([, value]) => value !== undefined)),
    $type: type,
  }) as unknown as AndroidModifier & Readonly<Params>
