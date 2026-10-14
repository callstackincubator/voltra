/**
 * Locale picking now lives in `@use-voltra/core` so widget code can use the same fallback rules
 * at render time (`resolveLocale`). Re-exported here so existing imports keep working.
 */
export { normalizeLocaleTag, pickLocalizedValue } from '@use-voltra/core/locale'
