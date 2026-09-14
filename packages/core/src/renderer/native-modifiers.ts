const isSkippedModifier = (value: unknown) => value === undefined || value === null || value === false

/**
 * Encodes the `modifiers` prop as a JSON string, so that no parsing layer treats the descriptors as
 * children or rewrites their keys (ADR 0005). Returns `undefined` when there is nothing to send.
 */
export function encodeNativeModifiers(value: unknown): string | undefined {
  // `modifiers={condition && [...]}` and `[condition && modifier]` are common in untyped JS; they
  // mean "no modifier", not a render error.
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
