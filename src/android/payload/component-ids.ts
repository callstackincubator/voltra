/**
 * Android component ID mappings for Jetpack Glance components.
 * These map to Glance composables on the native side.
 */
export const ANDROID_COMPONENT_NAME_TO_ID: Record<string, number> = {
  Text: 0,
  Column: 1,
  Row: 2,
  Box: 3,
  Spacer: 4,
  Image: 5,
  Button: 6,
  LinearProgressIndicator: 7,
  CircularProgressIndicator: 8,
  Switch: 9,
  RadioButton: 10,
  CheckBox: 11,
  FilledButton: 12,
  OutlineButton: 13,
  CircleIconButton: 14,
  SquareIconButton: 15,
  TitleBar: 16,
  Scaffold: 17,
  LazyColumn: 18,
  LazyVerticalGrid: 19,
}

/**
 * Mapping from numeric ID to component name
 */
export const ANDROID_COMPONENT_ID_TO_NAME: Record<number, string> = {
  0: 'Text',
  1: 'Column',
  2: 'Row',
  3: 'Box',
  4: 'Spacer',
  5: 'Image',
  6: 'Button',
  7: 'LinearProgressIndicator',
  8: 'CircularProgressIndicator',
  9: 'Switch',
  10: 'RadioButton',
  11: 'CheckBox',
  12: 'FilledButton',
  13: 'OutlineButton',
  14: 'CircleIconButton',
  15: 'SquareIconButton',
  16: 'TitleBar',
  17: 'Scaffold',
  18: 'LazyColumn',
  19: 'LazyVerticalGrid',
}

/**
 * Get Android component ID from name
 * @throws Error if component name is not found
 */
export function getAndroidComponentId(name: string): number {
  const id = ANDROID_COMPONENT_NAME_TO_ID[name]
  if (id === undefined) {
    throw new Error(
      `Unknown Android component name: "${name}". Available components: ${Object.keys(
        ANDROID_COMPONENT_NAME_TO_ID
      ).join(', ')}`
    )
  }
  return id
}

/**
 * Get Android component name from ID
 * @throws Error if component ID is not found
 */
export function getAndroidComponentName(id: number): string {
  const name = ANDROID_COMPONENT_ID_TO_NAME[id]
  if (name === undefined) {
    throw new Error(
      `Unknown Android component ID: ${id}. Valid IDs: 0-${Object.keys(ANDROID_COMPONENT_ID_TO_NAME).length - 1}`
    )
  }
  return name
}
