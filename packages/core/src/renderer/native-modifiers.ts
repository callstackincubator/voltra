// Every falsy value means "no modifier", the way React skips falsy children, so `count && modifier` with
// `count = 0` or `label && [...]` with `label = ''` renders without the modifier instead of failing.
const isSkippedModifier = (value: unknown) => !value

/**
 * A value that means "no modifier", for the whole `modifiers` prop or for one entry, so that
 * `[count && modifier]` and `label && [...]` type-check. `NaN` is skipped at runtime as well.
 */
export type NoNativeModifier = false | null | undefined | 0 | ''

/** The `modifiers` prop of a platform's components, typed by that platform's modifier. */
export type NativeModifiersProp<Modifier> = readonly (Modifier | NoNativeModifier)[] | NoNativeModifier

/**
 * Encodes the `modifiers` prop as a JSON string, so that no parsing layer treats the descriptors as
 * children or rewrites their keys (ADR 0005). Returns `undefined` when there is nothing to send.
 */
export function encodeNativeModifiers(value: unknown): string | undefined {
  // `modifiers={condition && [...]}` and `[condition && modifier]` mean "no modifier", not a render
  // error, whatever falsy value the condition produces.
  if (isSkippedModifier(value)) {
    return undefined
  }
  if (!Array.isArray(value)) {
    throw new Error('The `modifiers` prop must be an array of native modifiers.')
  }
  const modifiers = value.filter((modifier) => !isSkippedModifier(modifier))
  for (const modifier of modifiers) {
    if (typeof modifier !== 'object' || typeof modifier.$type !== 'string') {
      throw new Error(
        'The `modifiers` prop only accepts values created by `Voltra.modifiers` or `VoltraAndroid.modifiers`.'
      )
    }
  }
  return modifiers.length > 0 ? JSON.stringify(modifiers) : undefined
}
