// Type tests for color pairs. Each `@ts-expect-error` line must fail to compile; every other line must compile.
// Run by `pnpm --filter @use-voltra/android typecheck`.
import type { ComponentProps } from 'react'

import {
  AndroidDynamicColors,
  type AndroidColorPair,
  VoltraAndroid,
  type VoltraAndroidTextStyle,
  type VoltraAndroidViewStyle,
} from '@use-voltra/android'

type TextProps = ComponentProps<typeof VoltraAndroid.Text>
const { background } = VoltraAndroid.modifiers

export const typeTests = [
  (): AndroidColorPair => ({ day: '#ffffff', night: '#000000' }),
  (): AndroidColorPair => ({ day: 'rgba(32, 33, 36, 0.9)', night: 'transparent' }),
  (): VoltraAndroidViewStyle => ({ backgroundColor: { day: '#fff', night: '#000' } }),
  (): VoltraAndroidViewStyle => ({ borderColor: { day: '#fff', night: '#000' } }),
  (): VoltraAndroidViewStyle => ({ shadowColor: { day: '#fff', night: '#000' } }),
  (): VoltraAndroidTextStyle => ({ color: { day: '#fff', night: '#000' } }),
  (): VoltraAndroidViewStyle => ({ backgroundColor: '#fff' }),
  (): VoltraAndroidViewStyle => ({ backgroundColor: AndroidDynamicColors.primary }),
  (): TextProps => ({ color: '#f00' }),
  (): TextProps => ({ color: AndroidDynamicColors.onSurface }),
  (): TextProps => ({ color: { day: '#202124', night: 'white' } }),
  () => background('#fff'),
  () => background(AndroidDynamicColors.widgetBackground),
  () => background({ day: '#fff', night: '#000' }),
  (): VoltraAndroid.modifiers.DayNightColors<'#fff', '#000'> => ({ day: '#fff', night: '#000' }),

  // @ts-expect-error `night` is missing.
  (): AndroidColorPair => ({ day: '#fff' }),
  // @ts-expect-error sides must be strings.
  (): AndroidColorPair => ({ day: 1, night: 2 }),
  // @ts-expect-error a token is not allowed inside a pair.
  (): AndroidColorPair => ({ day: AndroidDynamicColors.primary, night: '#000' }),
  // @ts-expect-error a token is not allowed inside a pair.
  (): VoltraAndroidViewStyle => ({ backgroundColor: { day: AndroidDynamicColors.primary, night: '#000' } }),
  // @ts-expect-error a token is not allowed inside a pair.
  (): VoltraAndroidTextStyle => ({ color: { day: '#fff', night: AndroidDynamicColors.onSurface } }),
  // @ts-expect-error a token is not allowed inside a pair.
  (): TextProps => ({ color: { day: AndroidDynamicColors.onSurface, night: '#fff' } }),
  // @ts-expect-error a token is not allowed inside a pair.
  () => background({ day: '#fff', night: AndroidDynamicColors.surface }),
]
