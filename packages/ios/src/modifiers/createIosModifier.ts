declare const IOS_MODIFIER_BRAND: unique symbol

/**
 * A SwiftUI modifier descriptor produced by a `Voltra.modifiers` factory. The brand exists only
 * in the type system, so an Android modifier cannot be passed to a `Voltra` component.
 */
export type IosModifier = {
  readonly $type: string
  readonly [IOS_MODIFIER_BRAND]: 'ios'
}

export const createIosModifier = <Params extends Record<string, unknown>>(
  type: string,
  params?: Params
): IosModifier & Readonly<Params> =>
  Object.freeze({ ...params, $type: type }) as unknown as IosModifier & Readonly<Params>
