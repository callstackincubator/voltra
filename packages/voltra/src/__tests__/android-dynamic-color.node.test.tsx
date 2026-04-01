import React from 'react'

import { AndroidDynamicColors, VoltraAndroid } from '../android/index.js'
import { renderAndroidViewToJson, renderAndroidWidgetToString } from '../android/widgets/renderer.js'

describe('Android semantic color tokens', () => {
  it('exports the stable token map', () => {
    expect(AndroidDynamicColors).toEqual({
      primary: '~p',
      onPrimary: '~op',
      primaryContainer: '~pc',
      onPrimaryContainer: '~opc',
      secondary: '~s',
      onSecondary: '~os',
      secondaryContainer: '~sc',
      onSecondaryContainer: '~osc',
      tertiary: '~t',
      onTertiary: '~ot',
      tertiaryContainer: '~tc',
      onTertiaryContainer: '~otc',
      error: '~e',
      errorContainer: '~ec',
      onError: '~oe',
      onErrorContainer: '~oec',
      background: '~b',
      onBackground: '~ob',
      surface: '~sf',
      onSurface: '~osf',
      surfaceVariant: '~sv',
      onSurfaceVariant: '~osv',
      outline: '~ol',
      inverseOnSurface: '~ios',
      inverseSurface: '~is',
      inversePrimary: '~ip',
      widgetBackground: '~wb',
    })
  })

  it('preserves semantic color tokens in rendered widget payloads', () => {
    const output = renderAndroidWidgetToString([
      {
        size: { width: 150, height: 100 },
        content: (
          <VoltraAndroid.FilledButton
            text="Tap"
            backgroundColor={AndroidDynamicColors.primary}
            contentColor={AndroidDynamicColors.onPrimary}
          />
        ),
      },
    ])

    expect(output).toContain('"~p"')
    expect(output).toContain('"~op"')
  })

  it('renders Android views without palette context injection', () => {
    const output = renderAndroidViewToJson(
      <VoltraAndroid.Text style={{ color: AndroidDynamicColors.onSurface }}>Hello</VoltraAndroid.Text>
    ) as {
      variants?: Record<string, { c?: string }>
      s?: Array<Record<string, unknown>>
    }

    expect(output.variants?.content?.c).toBe('Hello')
    expect(JSON.stringify(output.s ?? [])).toContain('~osf')
  })
})
