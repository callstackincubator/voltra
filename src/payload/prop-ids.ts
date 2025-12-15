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
  'autoHideOnEnd': 2,
  'colors': 3,
  'cornerRadius': 4,
  'countDown': 5,
  'currentValueLabel': 6,
  'defaultValue': 7,
  'direction': 8,
  'dither': 9,
  'durationMs': 10,
  'endAtMs': 11,
  'endPoint': 12,
  'gaugeStyle': 13,
  'height': 14,
  'label': 15,
  'lineWidth': 16,
  'maskElement': 17,
  'maximumValue': 18,
  'maximumValueLabel': 19,
  'minLength': 20,
  'minimumValue': 21,
  'minimumValueLabel': 22,
  'multilineTextAlignment': 23,
  'name': 24,
  'numberOfLines': 25,
  'progressColor': 26,
  'resizeMode': 27,
  'scale': 28,
  'size': 29,
  'source': 30,
  'spacing': 31,
  'startAtMs': 32,
  'startPoint': 33,
  'stops': 34,
  'systemImage': 35,
  'textStyle': 36,
  'textTemplates': 37,
  'thumb': 38,
  'tintColor': 39,
  'title': 40,
  'trackColor': 41,
  'type': 42,
  'value': 43,
  'weight': 44
}

/**
 * Mapping from numeric ID to prop name
 */
export const PROP_ID_TO_NAME: Record<number, string> = {
  0: 'style',
  1: 'alignment',
  2: 'autoHideOnEnd',
  3: 'colors',
  4: 'cornerRadius',
  5: 'countDown',
  6: 'currentValueLabel',
  7: 'defaultValue',
  8: 'direction',
  9: 'dither',
  10: 'durationMs',
  11: 'endAtMs',
  12: 'endPoint',
  13: 'gaugeStyle',
  14: 'height',
  15: 'label',
  16: 'lineWidth',
  17: 'maskElement',
  18: 'maximumValue',
  19: 'maximumValueLabel',
  20: 'minLength',
  21: 'minimumValue',
  22: 'minimumValueLabel',
  23: 'multilineTextAlignment',
  24: 'name',
  25: 'numberOfLines',
  26: 'progressColor',
  27: 'resizeMode',
  28: 'scale',
  29: 'size',
  30: 'source',
  31: 'spacing',
  32: 'startAtMs',
  33: 'startPoint',
  34: 'stops',
  35: 'systemImage',
  36: 'textStyle',
  37: 'textTemplates',
  38: 'thumb',
  39: 'tintColor',
  40: 'title',
  41: 'trackColor',
  42: 'type',
  43: 'value',
  44: 'weight'
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
