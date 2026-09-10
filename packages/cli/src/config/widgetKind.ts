import type { IOSWidgetConfig } from './types'

/** Default prefix of a widget's WidgetKit `kind`: `Voltra_Widget_<id>`. Mirrors `VoltraStorageKeys.widgetKindPrefix`. */
export const IOS_WIDGET_KIND_PREFIX = 'Voltra_Widget_'

/** WidgetKit `kind` of a widget: the `kind` option when set, else `Voltra_Widget_<id>`. */
export function iosWidgetKind(widget: Pick<IOSWidgetConfig, 'id' | 'kind'>): string {
  return widget.kind ?? `${IOS_WIDGET_KIND_PREFIX}${widget.id}`
}

/**
 * `{ id: kind }` for the widgets that pin a custom `kind`, or undefined when none does.
 * Written to both Info.plists (`Voltra_WidgetKinds`) so native code maps ids to kinds and back.
 */
export function iosWidgetKindOverrides(
  widgets: Pick<IOSWidgetConfig, 'id' | 'kind'>[]
): Record<string, string> | undefined {
  const overrides: Record<string, string> = {}

  for (const widget of widgets) {
    if (widget.kind !== undefined) {
      overrides[widget.id] = widget.kind
    }
  }

  return Object.keys(overrides).length > 0 ? overrides : undefined
}
