/**
 * Types shared by iOS and Android Voltra config plugins.
 * Platform widget config types live in each client's expo-plugin package.
 */

/**
 * Per-locale strings for widget picker/gallery labels (`displayName`, `description`).
 * Keys should be BCP-47-style locale tags (e.g. `en`, `pl`, `pt-BR`). Plain `string` is still allowed for a single-language setup.
 */
export type WidgetLocalizedCopy = Record<string, string>

export type WidgetLabel = string | WidgetLocalizedCopy

/**
 * Build-time widget initial state source: a single file path, or per-locale paths (same key rules as `WidgetLocalizedCopy`).
 * Each path must point to a module that exports the widget variants / default export for prerendering.
 */
export type WidgetInitialStatePath = string | WidgetLocalizedCopy
