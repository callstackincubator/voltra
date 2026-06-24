/**
 * Types shared by iOS and Android Voltra config plugins.
 * Platform widget config types live in each client's expo-plugin package.
 */

export type DynamicWidgetPlatform = 'ios' | 'android'

/**
 * Shared app.json entry contract for Dynamic Widgets.
 *
 * `entry` stays optional during rollout so platform packages can adopt the shared contract
 * incrementally, but validation should require it for real widget declarations.
 */
export interface DynamicWidgetEntryConfig {
  entry?: string
}

export interface DynamicWidgetManifestWidget {
  id: string
  entry: string
}

export interface DynamicWidgetManifest {
  version: 1
  platform: DynamicWidgetPlatform
  widgets: DynamicWidgetManifestWidget[]
}

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
