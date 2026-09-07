import type { IOSWidgetConfig, IOSWidgetFamily } from './types'

export const IOS = {
  DEPLOYMENT_TARGET: '17.0',
  SWIFT_VERSION: '5.0',
  DEVICE_FAMILY: '1,2',
  LAST_SWIFT_MIGRATION: 1250,
} as const

/** Default path for user-provided widget images */
export const DEFAULT_USER_IMAGES_PATH = './assets/voltra'

export const SUPPORTED_IMAGE_EXTENSIONS = /\.(png|jpg|jpeg)$/i

export const DEFAULT_WIDGET_FAMILIES: IOSWidgetFamily[] = ['systemSmall', 'systemMedium', 'systemLarge']

export const WIDGET_FAMILY_MAP: Record<IOSWidgetFamily, string> = {
  systemSmall: '.systemSmall',
  systemMedium: '.systemMedium',
  systemLarge: '.systemLarge',
  systemExtraLarge: '.systemExtraLarge',
  accessoryCircular: '.accessoryCircular',
  accessoryRectangular: '.accessoryRectangular',
  accessoryInline: '.accessoryInline',
}

/** Default prefix of a widget's WidgetKit `kind`: `Voltra_Widget_<id>`. Mirrors `VoltraStorageKeys.widgetKindPrefix`. */
export const WIDGET_KIND_PREFIX = 'Voltra_Widget_'

/** WidgetKit `kind` of a widget: the `kind` option when set, else `Voltra_Widget_<id>`. */
export const widgetKind = (widget: Pick<IOSWidgetConfig, 'id' | 'kind'>): string =>
  widget.kind ?? `${WIDGET_KIND_PREFIX}${widget.id}`

/**
 * `{ id: kind }` for the widgets that pin a custom `kind`, or undefined when none does.
 * Written to both Info.plists (`Voltra_WidgetKinds`) so native code maps ids to kinds and back.
 */
export const widgetKindOverrides = (widgets?: IOSWidgetConfig[]): Record<string, string> | undefined => {
  const overrides: Record<string, string> = {}
  for (const widget of widgets ?? []) {
    if (widget.kind !== undefined) {
      overrides[widget.id] = widget.kind
    }
  }
  return Object.keys(overrides).length > 0 ? overrides : undefined
}
