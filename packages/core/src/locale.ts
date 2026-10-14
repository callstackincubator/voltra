/**
 * Locale negotiation shared by the Expo config plugins (initial-state and gallery-label pickers)
 * and by widget code at render time (ADR 0009 §5).
 *
 * The fallback order is the one the native initial-state pickers use: for each preferred tag an
 * exact match, then a language-only match; then `en` (or any `en-*`), then `__default`, then the
 * first key in sorted order.
 */

/** The locale fields of `WidgetEnvironment` / `LiveActivityEnvironment` that `resolveLocale`
 * reads. */
export type LocaleEnvironment = {
  locale?: string
  preferredLanguages?: readonly string[]
  appLocale?: string
}

const DEFAULT_LOCALE_KEY = '__default'

/** Lower-cases a locale tag and turns ICU underscores into BCP-47 hyphens (`pt_BR` → `pt-br`). */
export function normalizeLocaleTag(tag: string): string {
  return tag.trim().toLowerCase().replace(/_/g, '-')
}

function languageOf(normalizedTag: string): string {
  return normalizedTag.split('-')[0] ?? normalizedTag
}

/**
 * Picks the best key out of `keys` for the user's `preferredLanguages`, or `undefined` when there
 * are no keys.
 */
export function pickLocaleKey<K extends string>(
  keys: readonly K[],
  preferredLanguages: readonly string[]
): K | undefined {
  if (keys.length === 0) {
    return undefined
  }

  const byNorm = new Map<string, K>()
  for (const key of keys) {
    const normalized = normalizeLocaleTag(key)
    if (!byNorm.has(normalized)) {
      byNorm.set(normalized, key)
    }
  }

  for (const preferred of preferredLanguages) {
    const normalized = normalizeLocaleTag(preferred)
    const direct = byNorm.get(normalized)
    if (direct !== undefined) {
      return direct
    }
    const language = languageOf(normalized)
    for (const key of keys) {
      if (languageOf(normalizeLocaleTag(key)) === language) {
        return key
      }
    }
  }

  const english = byNorm.get('en')
  if (english !== undefined) {
    return english
  }

  const fallback = byNorm.get(DEFAULT_LOCALE_KEY)
  if (fallback !== undefined) {
    return fallback
  }

  return [...keys].sort((a, b) => a.localeCompare(b))[0]
}

/**
 * Picks a localized value from a locale-keyed map using the same fallback rules as the iOS and
 * Android runtimes: preferred language tags (full match, then language-only), then `en`, then
 * `__default`, then the first value in key order. Empty strings, `null` and `undefined` values are
 * skipped.
 */
export function pickLocalizedValue<T>(
  perLocale: Record<string, T>,
  preferredLanguages: readonly string[]
): T | undefined {
  const keys = Object.keys(perLocale).filter((key) => {
    const value = perLocale[key]
    return value !== undefined && value !== null && (value as unknown) !== ''
  })
  const key = pickLocaleKey(keys, preferredLanguages)
  return key === undefined ? undefined : perLocale[key]
}

/**
 * The languages a widget should try, most wanted first: the app's override
 * (`setDynamicWidgetLocale`), then the user's preferred languages, then the locale the widget is
 * drawn in. Duplicates are removed.
 */
export function localeCandidates(env: LocaleEnvironment): string[] {
  const candidates: string[] = []
  const seen = new Set<string>()
  const add = (tag: string | undefined) => {
    if (typeof tag !== 'string' || tag.length === 0) {
      return
    }
    const normalized = normalizeLocaleTag(tag)
    if (seen.has(normalized)) {
      return
    }
    seen.add(normalized)
    candidates.push(tag)
  }

  add(env.appLocale)
  for (const tag of env.preferredLanguages ?? []) {
    add(tag)
  }
  add(env.locale)
  return candidates
}

/**
 * Resolves which of the languages a widget ships should be used for this render.
 *
 * `supported` is either the list of language tags the widget has translations for, or the
 * messages object itself keyed by language tag. Returns the matching key, or `undefined` when
 * `supported` is empty.
 *
 * @example
 *   const messages = { en: { title: 'Weather' }, pl: { title: 'Pogoda' } }
 *   const t = messages[resolveLocale(env, messages) ?? 'en']
 */
export function resolveLocale<K extends string>(
  env: LocaleEnvironment,
  supported: readonly K[] | Readonly<Record<K, unknown>>
): K | undefined {
  const keys = (Array.isArray(supported) ? supported : Object.keys(supported)) as readonly K[]
  return pickLocaleKey(keys, localeCandidates(env))
}
