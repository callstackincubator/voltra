/* eslint-disable */
// 🤖 AUTO-GENERATED from data/components.json
// DO NOT EDIT MANUALLY - Changes will be overwritten
// Schema version: 1.0.0

/**
 * Mapping from Android component name to numeric ID
 * Component IDs are assigned sequentially based on order in components.json (0-indexed)
 */
export const ANDROID_COMPONENT_NAME_TO_ID: Record<string, number> = {
  AndroidFilledButton: 0,
  AndroidImage: 1,
  AndroidSwitch: 2,
  AndroidCheckBox: 3,
  AndroidRadioButton: 4,
  AndroidBox: 5,
  AndroidButton: 6,
  AndroidCircleIconButton: 7,
  AndroidCircularProgressIndicator: 8,
  AndroidColumn: 9,
  AndroidLazyColumn: 10,
  AndroidLazyVerticalGrid: 11,
  AndroidLinearProgressIndicator: 12,
  AndroidOutlineButton: 13,
  AndroidRow: 14,
  AndroidScaffold: 15,
  AndroidSpacer: 16,
  AndroidSquareIconButton: 17,
  AndroidText: 18,
  AndroidTitleBar: 19,
}

/**
 * Mapping from numeric ID to Android component name
 */
export const ANDROID_COMPONENT_ID_TO_NAME: Record<number, string> = {
  0: 'AndroidFilledButton',
  1: 'AndroidImage',
  2: 'AndroidSwitch',
  3: 'AndroidCheckBox',
  4: 'AndroidRadioButton',
  5: 'AndroidBox',
  6: 'AndroidButton',
  7: 'AndroidCircleIconButton',
  8: 'AndroidCircularProgressIndicator',
  9: 'AndroidColumn',
  10: 'AndroidLazyColumn',
  11: 'AndroidLazyVerticalGrid',
  12: 'AndroidLinearProgressIndicator',
  13: 'AndroidOutlineButton',
  14: 'AndroidRow',
  15: 'AndroidScaffold',
  16: 'AndroidSpacer',
  17: 'AndroidSquareIconButton',
  18: 'AndroidText',
  19: 'AndroidTitleBar',
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
