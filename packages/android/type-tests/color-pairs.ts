// Type tests for color pairs. Each `@ts-expect-error` line must fail to compile; every other line must compile.
// Run by `pnpm --filter @use-voltra/android typecheck`.
import type { AndroidColorPair, VoltraAndroidTextStyle, VoltraAndroidViewStyle } from '@use-voltra/android'

export const typeTests = [
  (): AndroidColorPair => ({ day: '#ffffff', night: '#000000' }),
  (): VoltraAndroidViewStyle => ({ backgroundColor: { day: '#fff', night: '#000' } }),
  (): VoltraAndroidViewStyle => ({ borderColor: { day: '#fff', night: '#000' } }),
  (): VoltraAndroidViewStyle => ({ shadowColor: { day: '#fff', night: '#000' } }),
  (): VoltraAndroidTextStyle => ({ color: { day: '#fff', night: '#000' } }),

  // @ts-expect-error `night` is missing.
  (): AndroidColorPair => ({ day: '#fff' }),
  // @ts-expect-error sides must be strings.
  (): AndroidColorPair => ({ day: 1, night: 2 }),
]
