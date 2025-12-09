/* eslint-disable */
// 🤖 AUTO-GENERATED from data/components.json
// DO NOT EDIT MANUALLY - Changes will be overwritten
// Schema version: 1.0.0

/**
 * Mapping from prop name to numeric ID
 * 'style' is always assigned ID 0, other props follow sequentially (starting from ID 1)
 */
export const PROP_NAME_TO_ID: Record<string, number> = {
  'style': 0,
  'alignment': 1,
  'animationSpec': 2,
  'autoHideOnEnd': 3,
  'axis': 4,
  'colors': 5,
  'cornerRadius': 6,
  'countDown': 7,
  'defaultValue': 8,
  'direction': 9,
  'dither': 10,
  'durationMs': 11,
  'effect': 12,
  'endAtMs': 13,
  'endPoint': 14,
  'height': 15,
  'hideValueLabel': 16,
  'interactive': 17,
  'isExpanded': 18,
  'lineWidth': 19,
  'maximumLabel': 20,
  'maximumValue': 21,
  'minLength': 22,
  'minimumLabel': 23,
  'minimumValue': 24,
  'name': 25,
  'progressColor': 26,
  'resizeMode': 27,
  'scale': 28,
  'showValueLabel': 29,
  'showsIndicators': 30,
  'size': 31,
  'source': 32,
  'spacing': 33,
  'startAtMs': 34,
  'startPoint': 35,
  'stops': 36,
  'systemImage': 37,
  'textStyle': 38,
  'textTemplates': 39,
  'thumb': 40,
  'tint': 41,
  'tintColor': 42,
  'title': 43,
  'trackColor': 44,
  'type': 45,
  'value': 46,
  'weight': 47
}

/**
 * Mapping from numeric ID to prop name
 */
export const PROP_ID_TO_NAME: Record<number, string> = {
  0: 'style',
  1: 'alignment',
  2: 'animationSpec',
  3: 'autoHideOnEnd',
  4: 'axis',
  5: 'colors',
  6: 'cornerRadius',
  7: 'countDown',
  8: 'defaultValue',
  9: 'direction',
  10: 'dither',
  11: 'durationMs',
  12: 'effect',
  13: 'endAtMs',
  14: 'endPoint',
  15: 'height',
  16: 'hideValueLabel',
  17: 'interactive',
  18: 'isExpanded',
  19: 'lineWidth',
  20: 'maximumLabel',
  21: 'maximumValue',
  22: 'minLength',
  23: 'minimumLabel',
  24: 'minimumValue',
  25: 'name',
  26: 'progressColor',
  27: 'resizeMode',
  28: 'scale',
  29: 'showValueLabel',
  30: 'showsIndicators',
  31: 'size',
  32: 'source',
  33: 'spacing',
  34: 'startAtMs',
  35: 'startPoint',
  36: 'stops',
  37: 'systemImage',
  38: 'textStyle',
  39: 'textTemplates',
  40: 'thumb',
  41: 'tint',
  42: 'tintColor',
  43: 'title',
  44: 'trackColor',
  45: 'type',
  46: 'value',
  47: 'weight'
}

/**
 * Get prop ID from name
 * @throws Error if prop name is not found
 */
export function getPropId(name: string): number {
  const id = PROP_NAME_TO_ID[name]
  if (id === undefined) {
    throw new Error(`Unknown prop name: "${name}". Available props: ${Object.keys(PROP_NAME_TO_ID).join(', ')}`)
  }
  return id
}

/**
 * Get prop name from ID
 * @throws Error if prop ID is not found
 */
export function getPropName(id: number): string {
  const name = PROP_ID_TO_NAME[id]
  if (name === undefined) {
    throw new Error(`Unknown prop ID: ${id}. Valid IDs: 0-${Object.keys(PROP_ID_TO_NAME).length - 1}`)
  }
  return name
}
