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
  'colors': 4,
  'cornerRadius': 5,
  'countDown': 6,
  'defaultValue': 7,
  'direction': 8,
  'dither': 9,
  'durationMs': 10,
  'effect': 11,
  'endAtMs': 12,
  'endPoint': 13,
  'height': 14,
  'hideValueLabel': 15,
  'interactive': 16,
  'lineWidth': 17,
  'maskElement': 18,
  'maximumValue': 19,
  'minLength': 20,
  'name': 21,
  'numberOfLines': 22,
  'progressColor': 23,
  'resizeMode': 24,
  'scale': 25,
  'showValueLabel': 26,
  'size': 27,
  'source': 28,
  'spacing': 29,
  'startAtMs': 30,
  'startPoint': 31,
  'stops': 32,
  'systemImage': 33,
  'textStyle': 34,
  'textTemplates': 35,
  'thumb': 36,
  'tint': 37,
  'tintColor': 38,
  'title': 39,
  'trackColor': 40,
  'type': 41,
  'value': 42,
  'weight': 43
}

/**
 * Mapping from numeric ID to prop name
 */
export const PROP_ID_TO_NAME: Record<number, string> = {
  0: 'style',
  1: 'alignment',
  2: 'animationSpec',
  3: 'autoHideOnEnd',
  4: 'colors',
  5: 'cornerRadius',
  6: 'countDown',
  7: 'defaultValue',
  8: 'direction',
  9: 'dither',
  10: 'durationMs',
  11: 'effect',
  12: 'endAtMs',
  13: 'endPoint',
  14: 'height',
  15: 'hideValueLabel',
  16: 'interactive',
  17: 'lineWidth',
  18: 'maskElement',
  19: 'maximumValue',
  20: 'minLength',
  21: 'name',
  22: 'numberOfLines',
  23: 'progressColor',
  24: 'resizeMode',
  25: 'scale',
  26: 'showValueLabel',
  27: 'size',
  28: 'source',
  29: 'spacing',
  30: 'startAtMs',
  31: 'startPoint',
  32: 'stops',
  33: 'systemImage',
  34: 'textStyle',
  35: 'textTemplates',
  36: 'thumb',
  37: 'tint',
  38: 'tintColor',
  39: 'title',
  40: 'trackColor',
  41: 'type',
  42: 'value',
  43: 'weight'
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
