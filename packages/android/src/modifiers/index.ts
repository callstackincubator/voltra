import { createAndroidModifier } from './createAndroidModifier.js'

export type { AndroidModifier } from './createAndroidModifier.js'

export type PaddingValues = {
  all?: number
  horizontal?: number
  vertical?: number
  start?: number
  top?: number
  end?: number
  bottom?: number
}

/**
 * Adds padding in dp. The most specific edge wins (`start` over `horizontal` over `all`).
 * Glance adds repeated `padding` modifiers together, including `style.padding`.
 *
 * @since Android 7.0
 */
export const padding = (values: number | PaddingValues) => {
  if (typeof values === 'number') {
    return createAndroidModifier('padding', { all: values })
  }
  // Copy only the known edges so extra keys on a caller's object never reach the device.
  const { all, horizontal, vertical, start, top, end, bottom } = values
  return createAndroidModifier('padding', { all, horizontal, vertical, start, top, end, bottom })
}

/**
 * Rounds the corners in dp. Glance ignores it below Android 12 (API 31).
 *
 * @since Android 12
 */
export const cornerRadius = (radius: number) => createAndroidModifier('cornerRadius', { radius })

/**
 * Shows, hides (keeping its space), or removes the component from layout.
 *
 * @since Android 7.0
 */
export const visibility = (value: 'visible' | 'invisible' | 'gone') =>
  createAndroidModifier('visibility', { visibility: value })
