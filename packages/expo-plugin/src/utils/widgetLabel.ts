import type { WidgetLabel, WidgetLocalizedCopy } from '../types'

import { pickLocalizedValue } from './localePick'

export function isWidgetLocalizedMap(label: WidgetLabel): label is WidgetLocalizedCopy {
  return typeof label === 'object' && label !== null && !Array.isArray(label)
}

/**
 * Development / fallback English copy for LocalizedStringResource.defaultValue.
 * Prefers `en`, then `en-*`, then default fallback order from locale picking.
 */
export function widgetLabelEnglish(label: WidgetLabel): string {
  if (!isWidgetLocalizedMap(label)) {
    return label
  }

  return pickLocalizedValue(label, ['en']) ?? ''
}
