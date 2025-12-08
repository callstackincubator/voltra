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
  'defaultValue': 6,
  'direction': 7,
  'dither': 8,
  'durationMs': 9,
  'effect': 10,
  'endAtMs': 11,
  'endPoint': 12,
  'hideValueLabel': 13,
  'interactive': 14,
  'isExpanded': 15,
  'maximumLabel': 16,
  'maximumValue': 17,
  'minLength': 18,
  'minimumLabel': 19,
  'minimumValue': 20,
  'mode': 21,
  'modeOrderedModifiers': 22,
  'modeTintColors': 23,
  'modeTrackColors': 24,
  'name': 25,
  'resizeMode': 26,
  'scale': 27,
  'showValueLabel': 28,
  'showsIndicators': 29,
  'size': 30,
  'source': 31,
  'spacing': 32,
  'startAtMs': 33,
  'startPoint': 34,
  'stops': 35,
  'systemImage': 36,
  'textStyle': 37,
  'textTemplates': 38,
  'timerEndDateInMilliseconds': 39,
  'tint': 40,
  'tintColor': 41,
  'title': 42,
  'type': 43,
  'weight': 44
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
  6: 'defaultValue',
  7: 'direction',
  8: 'dither',
  9: 'durationMs',
  10: 'effect',
  11: 'endAtMs',
  12: 'endPoint',
  13: 'hideValueLabel',
  14: 'interactive',
  15: 'isExpanded',
  16: 'maximumLabel',
  17: 'maximumValue',
  18: 'minLength',
  19: 'minimumLabel',
  20: 'minimumValue',
  21: 'mode',
  22: 'modeOrderedModifiers',
  23: 'modeTintColors',
  24: 'modeTrackColors',
  25: 'name',
  26: 'resizeMode',
  27: 'scale',
  28: 'showValueLabel',
  29: 'showsIndicators',
  30: 'size',
  31: 'source',
  32: 'spacing',
  33: 'startAtMs',
  34: 'startPoint',
  35: 'stops',
  36: 'systemImage',
  37: 'textStyle',
  38: 'textTemplates',
  39: 'timerEndDateInMilliseconds',
  40: 'tint',
  41: 'tintColor',
  42: 'title',
  43: 'type',
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
