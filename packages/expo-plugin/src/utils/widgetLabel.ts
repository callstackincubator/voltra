import type { WidgetLabel, WidgetLocalizedCopy } from '../types'

export function isWidgetLocalizedMap(label: WidgetLabel): label is WidgetLocalizedCopy {
  return typeof label === 'object' && label !== null && !Array.isArray(label)
}

/**
 * Development / fallback English copy for LocalizedStringResource.defaultValue.
 */
export function widgetLabelEnglish(label: WidgetLabel): string {
  if (!isWidgetLocalizedMap(label)) {
    return label
  }
  const en = label.en
  if (typeof en === 'string' && en.trim()) {
    return en
  }
  const first = Object.values(label).find((v) => typeof v === 'string' && v.trim())
  return first ?? ''
}
