import * as fs from 'fs'
import * as path from 'path'

import type { WidgetInitialStatePath } from './types'

/** Widget id: Swift / Kotlin identifier fragment and Android XML token fragment */
const WIDGET_ID_PATTERN = /^[a-zA-Z_][a-zA-Z0-9_]*$/

/**
 * Locale keys in app.json become iOS `.lproj` folder names and Android `values-*` qualifiers (after mapping).
 */
const LOCALE_KEY_PATTERN = /^[a-zA-Z][a-zA-Z0-9]*([_-][a-zA-Z0-9]+)*$/

const MAX_LOCALE_KEY_LENGTH = 32
const WIDGET_ENTRY_EXTENSIONS = new Set(['.js', '.jsx', '.ts', '.tsx', '.mjs', '.cjs'])
const WIDGET_ENTRY_FIELD_NAME = 'entry'

function isAbsoluteWidgetPath(value: string): boolean {
  return path.isAbsolute(value) || path.win32.isAbsolute(value) || /^[a-zA-Z]:[\\/]/.test(value)
}

function normalizeWidgetEntry(entry: string): string {
  return path.posix.normalize(entry.replace(/\\/g, '/'))
}

function widgetEntryExtension(entry: string): string {
  return path.posix.extname(entry)
}

export function validateHomeScreenWidgetId(widgetId: unknown): asserts widgetId is string {
  if (!widgetId || typeof widgetId !== 'string') {
    throw new Error('Widget ID is required and must be a string')
  }

  if (!WIDGET_ID_PATTERN.test(widgetId)) {
    throw new Error(
      `Widget ID '${widgetId}' is invalid. ` +
        'Must start with a letter or underscore and contain only alphanumeric characters and underscores.'
    )
  }
}

export function assertValidLocaleKey(localeKey: string, widgetId: string, fieldName: string): void {
  if (localeKey.trim() !== localeKey) {
    throw new Error(
      `Widget '${widgetId}': ${fieldName} locale key '${localeKey}' must not have leading or trailing whitespace`
    )
  }

  if (!localeKey) {
    throw new Error(`Widget '${widgetId}': ${fieldName} locale map contains an empty locale key`)
  }

  if (localeKey.length > MAX_LOCALE_KEY_LENGTH) {
    throw new Error(
      `Widget '${widgetId}': ${fieldName} locale key '${localeKey}' exceeds ${MAX_LOCALE_KEY_LENGTH} characters`
    )
  }

  if (!LOCALE_KEY_PATTERN.test(localeKey)) {
    throw new Error(
      `Widget '${widgetId}': ${fieldName} locale key '${localeKey}' is invalid. ` +
        'Use BCP-47-style tags (e.g. en, pl, pt-BR, zh-Hans). Letters, digits, single separators _ or - only.'
    )
  }
}

export function validateWidgetLabel(value: unknown, widgetId: string, fieldName: string): void {
  if (typeof value === 'string') {
    if (!value.trim()) {
      throw new Error(`Widget '${widgetId}': ${fieldName} is required`)
    }
    return
  }

  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    throw new Error(
      `Widget '${widgetId}': ${fieldName} must be a string or a locale map (e.g. { "en": "...", "pl": "..." })`
    )
  }

  const entries = Object.entries(value as Record<string, unknown>)
  if (entries.length === 0) {
    throw new Error(`Widget '${widgetId}': ${fieldName} locale map must not be empty`)
  }

  const localeKeys = new Set<string>()
  for (const [locale, v] of entries) {
    assertValidLocaleKey(locale, widgetId, fieldName)

    const normalized = locale.toLowerCase().replace(/_/g, '-')
    if (localeKeys.has(normalized)) {
      throw new Error(
        `Widget '${widgetId}': ${fieldName} duplicates locale '${locale}' (underscore and hyphen forms count as the same, e.g. pt_BR vs pt-BR)`
      )
    }
    localeKeys.add(normalized)

    if (typeof v !== 'string' || !v.trim()) {
      throw new Error(`Widget '${widgetId}': ${fieldName}.${locale} must be a non-empty string`)
    }
  }
}

export function normalizeWidgetEntryPath(entry: string, projectRoot?: string): string {
  const normalizedInput = normalizeWidgetEntry(entry)

  if (projectRoot) {
    const absolutePath = path.resolve(projectRoot, normalizedInput)
    const relativePath = path.relative(projectRoot, absolutePath)
    return normalizeWidgetEntry(relativePath)
  }

  return normalizedInput
}

export function validateWidgetEntry(value: unknown, widgetId: string, projectRoot?: string): string {
  if (typeof value !== 'string' || !value.trim()) {
    throw new Error(`Widget '${widgetId}': ${WIDGET_ENTRY_FIELD_NAME} is required`)
  }

  if (isAbsoluteWidgetPath(value)) {
    throw new Error(`Widget '${widgetId}': ${WIDGET_ENTRY_FIELD_NAME} must be a relative path, not an absolute path`)
  }

  const normalizedEntry = normalizeWidgetEntryPath(value)
  if (!normalizedEntry || normalizedEntry === '.') {
    throw new Error(`Widget '${widgetId}': ${WIDGET_ENTRY_FIELD_NAME} must point to a file inside the project root`)
  }

  if (normalizedEntry === '..' || normalizedEntry.startsWith('../')) {
    throw new Error(
      `Widget '${widgetId}': ${WIDGET_ENTRY_FIELD_NAME} must stay within the project root after normalization`
    )
  }

  const extension = widgetEntryExtension(normalizedEntry)
  if (!WIDGET_ENTRY_EXTENSIONS.has(extension)) {
    throw new Error(
      `Widget '${widgetId}': ${WIDGET_ENTRY_FIELD_NAME} must use a Metro-importable source extension ` +
        `(${Array.from(WIDGET_ENTRY_EXTENSIONS).join(', ')}); received '${extension || '(none)'}'`
    )
  }

  if (!projectRoot) {
    return normalizedEntry
  }

  const normalizedInput = normalizeWidgetEntry(value)
  const absolutePath = path.resolve(projectRoot, normalizedInput)
  const normalizedProjectRelativePath = normalizeWidgetEntryPath(normalizedInput, projectRoot)

  if (normalizedProjectRelativePath === '..' || normalizedProjectRelativePath.startsWith('../')) {
    throw new Error(
      `Widget '${widgetId}': ${WIDGET_ENTRY_FIELD_NAME} must stay within the project root after normalization`
    )
  }

  if (!fs.existsSync(absolutePath) || !fs.statSync(absolutePath).isFile()) {
    throw new Error(
      `Widget '${widgetId}': ${WIDGET_ENTRY_FIELD_NAME} file not found at ${normalizedProjectRelativePath}`
    )
  }

  return normalizedProjectRelativePath
}

/**
 * Validates optional initialStatePath: plain string or locale map of project-relative file paths.
 */
export function validateInitialStatePath(
  value: WidgetInitialStatePath | undefined,
  widgetId: string,
  projectRoot?: string
): void {
  if (value === undefined) {
    return
  }

  const assertPathExists = (relativePath: string, ctx: string) => {
    if (!relativePath.trim()) {
      throw new Error(`Widget '${widgetId}': initialStatePath ${ctx} must be a non-empty path`)
    }
    if (projectRoot) {
      const fullPath = path.join(projectRoot, relativePath)
      if (!fs.existsSync(fullPath)) {
        throw new Error(`Widget '${widgetId}': initialStatePath file not found at ${relativePath}`)
      }
    }
  }

  if (typeof value === 'string') {
    assertPathExists(value, '')
    return
  }

  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    throw new Error(
      `Widget '${widgetId}': initialStatePath must be a string or a locale map of paths (e.g. { "en": "./widgets/en.tsx", "pl": "./widgets/pl.tsx" })`
    )
  }

  const entries = Object.entries(value as Record<string, unknown>)
  if (entries.length === 0) {
    throw new Error(`Widget '${widgetId}': initialStatePath locale map must not be empty`)
  }

  const localeKeys = new Set<string>()
  for (const [locale, v] of entries) {
    assertValidLocaleKey(locale, widgetId, 'initialStatePath')

    const normalized = locale.toLowerCase().replace(/_/g, '-')
    if (localeKeys.has(normalized)) {
      throw new Error(
        `Widget '${widgetId}': initialStatePath duplicates locale '${locale}' (underscore and hyphen forms count as the same)`
      )
    }
    localeKeys.add(normalized)

    if (typeof v !== 'string' || !v.trim()) {
      throw new Error(`Widget '${widgetId}': initialStatePath.${locale} must be a non-empty path string`)
    }
    assertPathExists(v, `.${locale}`)
  }
}
