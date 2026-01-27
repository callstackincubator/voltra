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
  'Label': 2,
  'Symbol': 3,
  'Toggle': 4,
  'LinearProgressView': 5,
  'CircularProgressView': 6,
  'Gauge': 7,
  'Timer': 8,
  'LinearGradient': 9,
  'VStack': 10,
  'HStack': 11,
  'ZStack': 12,
  'GroupBox': 13,
  'GlassContainer': 14,
  'Spacer': 15,
  'Divider': 16,
  'Mask': 17
}

/**
 * Mapping from numeric ID to component name
 */
export const COMPONENT_ID_TO_NAME: Record<number, string> = {
  0: 'Text',
  1: 'Button',
  2: 'Label',
  3: 'Symbol',
  4: 'Toggle',
  5: 'LinearProgressView',
  6: 'CircularProgressView',
  7: 'Gauge',
  8: 'Timer',
  9: 'LinearGradient',
  10: 'VStack',
  11: 'HStack',
  12: 'ZStack',
  13: 'GroupBox',
  14: 'GlassContainer',
  15: 'Spacer',
  16: 'Divider',
  17: 'Mask'
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
