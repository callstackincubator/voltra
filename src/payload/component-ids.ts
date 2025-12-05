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
  'Label': 2,
  'Image': 3,
  'Symbol': 4,
  'Toggle': 5,
  'Slider': 6,
  'ProgressView': 7,
  'Gauge': 8,
  'Timer': 9,
  'LinearGradient': 10,
  'VStack': 11,
  'HStack': 12,
  'ZStack': 13,
  'ScrollView': 14,
  'List': 15,
  'NavigationView': 16,
  'Form': 17,
  'GroupBox': 18,
  'DisclosureGroup': 19,
  'HSplitView': 20,
  'VSplitView': 21,
  'Picker': 22,
  'GlassContainer': 23,
  'GlassView': 24,
  'Spacer': 25,
  'Divider': 26
}

/**
 * Mapping from numeric ID to component name
 */
export const COMPONENT_ID_TO_NAME: Record<number, string> = {
  0: 'Text',
  1: 'Button',
  2: 'Label',
  3: 'Image',
  4: 'Symbol',
  5: 'Toggle',
  6: 'Slider',
  7: 'ProgressView',
  8: 'Gauge',
  9: 'Timer',
  10: 'LinearGradient',
  11: 'VStack',
  12: 'HStack',
  13: 'ZStack',
  14: 'ScrollView',
  15: 'List',
  16: 'NavigationView',
  17: 'Form',
  18: 'GroupBox',
  19: 'DisclosureGroup',
  20: 'HSplitView',
  21: 'VSplitView',
  22: 'Picker',
  23: 'GlassContainer',
  24: 'GlassView',
  25: 'Spacer',
  26: 'Divider'
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
