import * as fs from 'fs'
import * as path from 'path'

import {
  collectLabelLocaleKeys,
  collectWidgetConfigurationStrings,
  isWidgetLocalizedMap,
  normalizeLocaleTag,
  pickLocalizedValue,
  widgetLabelEnglish,
  type WidgetLabel,
} from '@use-voltra/expo-plugin'

import type { IOSWidgetConfig } from '../../types'
import { VOLTRA_LOCALIZABLE_STRINGS_BASENAME } from '../../utils/fileDiscovery'
import { escapeForSwiftStringLiteral } from './swift-utils'

/**
 * The parts of the Expo config that say which languages the app supports: the `locales` map
 * (`{ "pl": "./languages/pl.json" }`) and an explicit `ios.infoPlist.CFBundleLocalizations`.
 */
export interface AppLocalizationSource {
  locales?: Record<string, unknown> | null
  ios?: { infoPlist?: Record<string, unknown> | null } | null
}

function widgetLabels(widget: IOSWidgetConfig): Array<WidgetLabel | undefined> {
  return [
    widget.displayName,
    widget.description,
    widget.configurationTitle,
    ...(widget.appIntent?.parameters ?? []).flatMap((parameter) => [
      parameter.title,
      ...(parameter.options ?? []).map((option) => option.title),
    ]),
  ]
}

const LOCALE_TAG_PATTERN = /^[a-zA-Z][a-zA-Z0-9]*([_-][a-zA-Z0-9]+)*$/

/**
 * The app's development language: `ios.infoPlist.CFBundleDevelopmentRegion` when it is a literal
 * locale tag, otherwise `en` (Expo's default, and what `$(DEVELOPMENT_LANGUAGE)` is in practice).
 */
export function resolveDevelopmentRegion(config: AppLocalizationSource | undefined): string {
  const region = config?.ios?.infoPlist?.CFBundleDevelopmentRegion
  return typeof region === 'string' && LOCALE_TAG_PATTERN.test(region.trim()) ? region.trim() : 'en'
}

/**
 * The languages the widget extension declares (ADR 0008 §4).
 *
 * iOS resolves `Locale.current` and SwiftUI's `\.locale` in the extension against the extension
 * bundle's own localisations, so an extension that declares none reports `en_PL` to a Polish user
 * of a Polish app. Mirroring the app's languages makes the extension resolve the way the app does.
 *
 * Sources: the Expo `locales` keys, `ios.infoPlist.CFBundleLocalizations`, and every locale used
 * by a widget's locale maps. The app's development language (see `resolveDevelopmentRegion`) is
 * added whenever anything is declared: it is the language iOS falls back to when none of the user's
 * languages match, so its `.lproj` must exist and carry every string.
 */
export function resolveExtensionLocalizations(
  config: AppLocalizationSource | undefined,
  widgets: IOSWidgetConfig[] | undefined
): string[] {
  const candidates: string[] = []

  for (const locale of Object.keys(config?.locales ?? {})) {
    candidates.push(locale)
  }

  const infoPlistLocalizations = config?.ios?.infoPlist?.CFBundleLocalizations
  if (Array.isArray(infoPlistLocalizations)) {
    for (const locale of infoPlistLocalizations) {
      if (typeof locale === 'string') {
        candidates.push(locale)
      }
    }
  }

  candidates.push(...collectLabelLocaleKeys((widgets ?? []).flatMap(widgetLabels)))

  const byNormalized = new Map<string, string>()
  for (const candidate of candidates) {
    const trimmed = candidate.trim()
    if (!trimmed || trimmed === '__default' || !LOCALE_TAG_PATTERN.test(trimmed)) {
      continue
    }
    const normalized = normalizeLocaleTag(trimmed)
    if (!byNormalized.has(normalized)) {
      byNormalized.set(normalized, trimmed)
    }
  }

  const developmentRegion = resolveDevelopmentRegion(config)
  const developmentLanguage = normalizeLocaleTag(developmentRegion).split('-')[0]
  if (byNormalized.size > 0 && ![...byNormalized.keys()].some((key) => key.split('-')[0] === developmentLanguage)) {
    byNormalized.set(normalizeLocaleTag(developmentRegion), developmentRegion)
  }

  return [...byNormalized.values()].sort((a, b) => a.localeCompare(b))
}

/**
 * The Edit Widget sheet strings for one locale: every locale-mapped title, resolved for `locale`,
 * then the development language, then the usual fallback (English, `__default`, first), so every
 * key resolves in every `.lproj` and none shows verbatim. Plain-string titles are compiled into the
 * Swift source as literals and need no entry.
 */
export function collectSheetStringsForLocale(
  widgets: IOSWidgetConfig[] | undefined,
  locale: string,
  developmentRegion = 'en'
): Record<string, string> {
  const entries: Record<string, string> = {}
  for (const widget of widgets ?? []) {
    for (const { key, label } of collectWidgetConfigurationStrings(widget)) {
      if (!isWidgetLocalizedMap(label)) {
        continue
      }
      entries[key] = pickLocalizedValue(label, [locale, developmentRegion]) ?? widgetLabelEnglish(label)
    }
  }
  return entries
}

function formatLocalizableStrings(entries: Record<string, string>): string {
  const lines = Object.keys(entries)
    .sort()
    .map((key) => `"${escapeForSwiftStringLiteral(key)}" = "${escapeForSwiftStringLiteral(entries[key]!)}";`)
  return `/* Voltra widget extension strings (auto-generated) */\n${lines.join('\n')}${lines.length > 0 ? '\n' : ''}`
}

/**
 * Writes `<locale>.lproj/Localizable.strings` for every declared language. The file carries the
 * Edit Widget sheet strings (ADR 0008 §6) and, even when empty, makes the `.lproj` folder a real
 * resource of the extension target so iOS sees the language as supported.
 *
 * The extension is generated and owned by Voltra, so every `Localizable.strings` in it is ours to
 * rewrite; stale ones from a removed language are deleted.
 */
export function syncExtensionLocalizableStrings(
  targetPath: string,
  locales: string[],
  widgets: IOSWidgetConfig[] | undefined,
  developmentRegion = 'en'
): void {
  if (fs.existsSync(targetPath)) {
    for (const entry of fs.readdirSync(targetPath)) {
      if (!entry.endsWith('.lproj')) {
        continue
      }
      const dirPath = path.join(targetPath, entry)
      const stringsPath = path.join(dirPath, VOLTRA_LOCALIZABLE_STRINGS_BASENAME)
      if (fs.existsSync(stringsPath)) {
        fs.unlinkSync(stringsPath)
      }
      try {
        if (fs.readdirSync(dirPath).length === 0) {
          fs.rmdirSync(dirPath)
        }
      } catch {
        /* ignore */
      }
    }
  }

  for (const locale of locales) {
    const lproj = path.join(targetPath, `${locale}.lproj`)
    fs.mkdirSync(lproj, { recursive: true })
    fs.writeFileSync(
      path.join(lproj, VOLTRA_LOCALIZABLE_STRINGS_BASENAME),
      formatLocalizableStrings(collectSheetStringsForLocale(widgets, locale, developmentRegion)),
      'utf8'
    )
  }
}
