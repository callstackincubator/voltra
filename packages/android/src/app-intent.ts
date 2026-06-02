/**
 * Returns a template expression that the server renderer emits verbatim and the
 * widget extension resolves at render time against the current AppIntent
 * parameter value (Track 4 PoC).
 *
 * Mirrors `appIntentParam` from `@use-voltra/ios` so the developer experience
 * is identical across platforms.
 *
 * @example
 *   <VoltraAndroid.Text>{appIntentParam('city')}</VoltraAndroid.Text>
 *   // Server renders as: "{{ appIntent.city }}"
 *   // Hermes resolves to the configured value at render time.
 */
export function appIntentParam(name: string): string {
  return `{{ appIntent.${name} }}`
}
