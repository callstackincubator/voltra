import type { WidgetConfigurationCopySource, WidgetLabel } from './types'
import { isWidgetLocalizedMap } from './utils/widgetLabel'
import { validateWidgetLabel } from './validation'

/** Swift property / Kotlin-safe identifier, also the key under `env.configuration`. */
const PARAMETER_NAME_PATTERN = /^[a-zA-Z_][a-zA-Z0-9_]*$/

/**
 * A string the operating system shows while the user configures a widget (ADR 0009 §6): a
 * parameter title or an option label. `key` is the same on both platforms, apart from the
 * resource-name sanitising Android needs.
 */
export interface WidgetConfigurationString {
  key: string
  label: WidgetLabel
}

type KeyPart = (value: string) => string

const identity: KeyPart = (value) => value

export function widgetParameterTitleKey(widgetId: string, parameterName: string, part: KeyPart = identity): string {
  return `voltra_widget_${part(widgetId)}_param_${part(parameterName)}_title`
}

export function widgetParameterOptionKey(
  widgetId: string,
  parameterName: string,
  optionValue: string,
  part: KeyPart = identity
): string {
  return `voltra_widget_${part(widgetId)}_param_${part(parameterName)}_option_${part(optionValue)}`
}

/**
 * Every configuration-sheet string a widget declares, in declaration order. `part` sanitises each
 * key segment (Android resource names allow only `[a-z0-9_]`).
 */
export function collectWidgetConfigurationStrings(
  widget: WidgetConfigurationCopySource,
  part: KeyPart = identity
): WidgetConfigurationString[] {
  const strings: WidgetConfigurationString[] = []

  for (const parameter of widget.appIntent?.parameters ?? []) {
    if (parameter.title !== undefined) {
      strings.push({ key: widgetParameterTitleKey(widget.id, parameter.name, part), label: parameter.title })
    }
    for (const option of parameter.options ?? []) {
      strings.push({
        key: widgetParameterOptionKey(widget.id, parameter.name, option.value, part),
        label: option.title,
      })
    }
  }

  return strings
}

/** Locale keys used by any locale map among `labels`, `__default` excluded. */
export function collectLabelLocaleKeys(labels: Iterable<WidgetLabel | undefined>): string[] {
  const keys = new Set<string>()
  for (const label of labels) {
    if (label === undefined || !isWidgetLocalizedMap(label)) {
      continue
    }
    for (const [locale, value] of Object.entries(label)) {
      if (locale !== '__default' && typeof value === 'string' && value.trim()) {
        keys.add(locale)
      }
    }
  }
  return [...keys]
}

/**
 * Validates `appIntent.parameters[]` (titles as plain strings or locale maps, and static
 * `options`).
 */
export function validateWidgetConfigurationCopy(
  widget: WidgetConfigurationCopySource,
  options: {
    requireParameterTitle: boolean
    /** iOS compiles names into Swift properties; Android only uses them as keys. Default `true`. */
    requireIdentifierName?: boolean
  }
): void {
  const widgetId = widget.id

  const appIntent = widget.appIntent as unknown
  if (appIntent === undefined) {
    return
  }
  if (typeof appIntent !== 'object' || appIntent === null || !Array.isArray((appIntent as any).parameters)) {
    throw new Error(`Widget '${widgetId}': appIntent.parameters must be an array`)
  }

  const names = new Set<string>()
  for (const [index, parameter] of (appIntent as { parameters: unknown[] }).parameters.entries()) {
    const context = `appIntent.parameters[${index}]`
    if (typeof parameter !== 'object' || parameter === null) {
      throw new Error(`Widget '${widgetId}': ${context} must be an object`)
    }
    const { name, title, default: defaultValue, options: parameterOptions } = parameter as Record<string, unknown>

    if (typeof name !== 'string' || !name) {
      throw new Error(`Widget '${widgetId}': ${context}.name must be a non-empty string`)
    }
    if ((options.requireIdentifierName ?? true) && !PARAMETER_NAME_PATTERN.test(name)) {
      throw new Error(
        `Widget '${widgetId}': ${context}.name must start with a letter or underscore and contain only letters, digits and underscores`
      )
    }
    if (names.has(name)) {
      throw new Error(`Widget '${widgetId}': appIntent parameter '${name}' is declared more than once`)
    }
    names.add(name)

    if (title === undefined) {
      if (options.requireParameterTitle) {
        throw new Error(`Widget '${widgetId}': appIntent parameter '${name}' needs a title`)
      }
    } else {
      validateWidgetLabel(title, widgetId, `appIntent parameter '${name}' title`)
    }

    if (defaultValue !== undefined && typeof defaultValue !== 'string') {
      throw new Error(`Widget '${widgetId}': appIntent parameter '${name}' default must be a string`)
    }

    if (parameterOptions === undefined) {
      continue
    }
    if (!Array.isArray(parameterOptions) || parameterOptions.length === 0) {
      throw new Error(`Widget '${widgetId}': appIntent parameter '${name}' options must be a non-empty array`)
    }
    const values = new Set<string>()
    for (const option of parameterOptions) {
      const value = (option as Record<string, unknown> | null)?.value
      if (typeof value !== 'string' || !value) {
        throw new Error(`Widget '${widgetId}': every option of appIntent parameter '${name}' needs a string value`)
      }
      if (values.has(value)) {
        throw new Error(`Widget '${widgetId}': appIntent parameter '${name}' lists option '${value}' twice`)
      }
      values.add(value)
      validateWidgetLabel(
        (option as Record<string, unknown>).title,
        widgetId,
        `appIntent parameter '${name}' option '${value}' title`
      )
    }
    if (defaultValue !== undefined && !values.has(defaultValue)) {
      throw new Error(
        `Widget '${widgetId}': appIntent parameter '${name}' default '${defaultValue}' is not one of its options`
      )
    }
  }
}
