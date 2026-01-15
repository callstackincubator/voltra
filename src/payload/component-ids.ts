/* eslint-disable */
// 🤖 AUTO-GENERATED from data/components.json
// DO NOT EDIT MANUALLY - Changes will be overwritten
// Schema version: 1.0.0

/**
 * Mapping from component name to numeric ID
 * Component IDs are assigned sequentially based on order in components.json (0-indexed)
 */
export const COMPONENT_NAME_TO_ID: Record<string, number> = {
  'Text': 0,
  'Button': 1,
  'AndroidFilledButton': 2,
  'Label': 3,
  'AndroidImage': 4,
  'Symbol': 5,
  'Toggle': 6,
  'AndroidSwitch': 7,
  'AndroidCheckBox': 8,
  'AndroidRadioButton': 9,
  'LinearProgressView': 10,
  'CircularProgressView': 11,
  'Gauge': 12,
  'Timer': 13,
  'LinearGradient': 14,
  'VStack': 15,
  'HStack': 16,
  'ZStack': 17,
  'GroupBox': 18,
  'GlassContainer': 19,
  'Spacer': 20,
  'Divider': 21,
  'Mask': 22,
  'AndroidBox': 23,
  'AndroidButton': 24,
  'AndroidCircleIconButton': 25,
  'AndroidCircularProgressIndicator': 26,
  'AndroidColumn': 27,
  'AndroidLazyColumn': 28,
  'AndroidLazyVerticalGrid': 29,
  'AndroidLinearProgressIndicator': 30,
  'AndroidOutlineButton': 31,
  'AndroidRow': 32,
  'AndroidScaffold': 33,
  'AndroidSpacer': 34,
  'AndroidSquareIconButton': 35,
  'AndroidText': 36,
  'AndroidTitleBar': 37
}

/**
 * Mapping from numeric ID to component name
 */
export const COMPONENT_ID_TO_NAME: Record<number, string> = {
  0: 'Text',
  1: 'Button',
  2: 'AndroidFilledButton',
  3: 'Label',
  4: 'AndroidImage',
  5: 'Symbol',
  6: 'Toggle',
  7: 'AndroidSwitch',
  8: 'AndroidCheckBox',
  9: 'AndroidRadioButton',
  10: 'LinearProgressView',
  11: 'CircularProgressView',
  12: 'Gauge',
  13: 'Timer',
  14: 'LinearGradient',
  15: 'VStack',
  16: 'HStack',
  17: 'ZStack',
  18: 'GroupBox',
  19: 'GlassContainer',
  20: 'Spacer',
  21: 'Divider',
  22: 'Mask',
  23: 'AndroidBox',
  24: 'AndroidButton',
  25: 'AndroidCircleIconButton',
  26: 'AndroidCircularProgressIndicator',
  27: 'AndroidColumn',
  28: 'AndroidLazyColumn',
  29: 'AndroidLazyVerticalGrid',
  30: 'AndroidLinearProgressIndicator',
  31: 'AndroidOutlineButton',
  32: 'AndroidRow',
  33: 'AndroidScaffold',
  34: 'AndroidSpacer',
  35: 'AndroidSquareIconButton',
  36: 'AndroidText',
  37: 'AndroidTitleBar'
}

/**
 * Get component ID from name
 * @throws Error if component name is not found
 */
export function getComponentId(name: string): number {
  const id = COMPONENT_NAME_TO_ID[name]
  if (id === undefined) {
    throw new Error(`Unknown component name: "${name}". Available components: ${Object.keys(COMPONENT_NAME_TO_ID).join(', ')}`)
  }
  return id
}

/**
 * Get component name from ID
 * @throws Error if component ID is not found
 */
export function getComponentName(id: number): string {
  const name = COMPONENT_ID_TO_NAME[id]
  if (name === undefined) {
    throw new Error(`Unknown component ID: ${id}. Valid IDs: 0-${Object.keys(COMPONENT_ID_TO_NAME).length - 1}`)
  }
  return name
}
