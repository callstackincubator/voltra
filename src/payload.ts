const MAX_ACTIVITYKIT_BYTES = 4096
// Leave headroom below the hard ActivityKit limit to account for the native envelope.
const EFFECTIVE_JSON_BUDGET = 3345

const utf8ByteLength = (s: string): number => {
  try {
    if (typeof TextEncoder !== 'undefined') return new TextEncoder().encode(s).length
  } catch {}
  try {
    return encodeURI(s).replace(/%[A-F\d]{2}/gi, 'X').length
  } catch {
    return s.length
  }
}

export const ensurePayloadWithinBudget = (compressedPayload: string): void => {
  // Validate compressed payload size (base64-encoded string)
  const bytes = utf8ByteLength(compressedPayload)

  if (bytes > EFFECTIVE_JSON_BUDGET) {
    throw new Error(
      `[Voltra] Compressed payload size ${bytes}B exceeds safe budget ${EFFECTIVE_JSON_BUDGET}B (ActivityKit hard cap ${MAX_ACTIVITYKIT_BYTES}B). You need to reduce the complexity of your UI.`
    )
  }
}
