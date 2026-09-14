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
  Object.freeze({ $type: type, ...params }) as unknown as AndroidModifier & Readonly<Params>
