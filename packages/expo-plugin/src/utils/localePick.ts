/**
 * Picks a localized string value from a locale-keyed map using the same fallback rules as iOS/Android runtimes:
 * preferred language tags (full match, then language-only), then `en`, then `__default`, then first value.
 */
export function normalizeLocaleTag(tag: string): string {
  return tag.trim().toLowerCase().replace(/_/g, '-')
}

export function pickLocalizedValue(
  perLocale: Record<string, string>,
  preferredLanguages: string[]
): string | undefined {
  const entries = Object.entries(perLocale).filter(([, v]) => typeof v === 'string' && v.length > 0)
  if (entries.length === 0) {
    return undefined
  }

  const byNorm = new Map<string, string>()
  for (const [k, v] of entries) {
    byNorm.set(normalizeLocaleTag(k), v)
  }

  const DEFAULT_KEY = '__default'

  for (const pref of preferredLanguages) {
    const n = normalizeLocaleTag(pref)
    const direct = byNorm.get(n)
    if (direct !== undefined) {
      return direct
    }
    const lang = n.split('-')[0] ?? n
    for (const [key, val] of entries) {
      const kn = normalizeLocaleTag(key)
      const keyLang = kn.split('-')[0] ?? kn
      if (keyLang === lang) {
        return val
      }
    }
  }

  const en = byNorm.get('en') ?? entries.find(([k]) => normalizeLocaleTag(k) === 'en')?.[1]
  if (en !== undefined) {
    return en
  }

  const defaultVal = byNorm.get(DEFAULT_KEY) ?? entries.find(([k]) => k === DEFAULT_KEY)?.[1]
  if (defaultVal !== undefined) {
    return defaultVal
  }

  const sorted = [...entries].sort(([a], [b]) => a.localeCompare(b))
  return sorted[0]?.[1]
}
