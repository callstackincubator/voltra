import React from 'react'

import { env, VoltraAndroid } from '../android/index.js'
import { renderAndroidViewToJson, renderAndroidWidgetToString } from '../android/widgets/renderer.js'

describe('Android Material colors via resolvable env', () => {
  it('serializes env.primary as a wrapped resolvable payload', () => {
    const output = renderAndroidWidgetToString([
      {
        size: { width: 150, height: 100 },
        content: <VoltraAndroid.FilledButton text="Tap" backgroundColor={env.primary} contentColor={env.onPrimary} />,
      },
    ])

    expect(output).toContain('"$rv"')
    expect(output).toContain('[0,2]')
    expect(output).toContain('[0,3]')
  })

  it('renders Android views with resolvable color expressions in styles', () => {
    const output = renderAndroidViewToJson(
      <VoltraAndroid.Text style={{ color: env.onSurface }}>Hello</VoltraAndroid.Text>
    ) as {
      variants?: Record<string, { c?: string }>
      s?: Array<Record<string, unknown>>
    }

    expect(output.variants?.content?.c).toBe('Hello')
    expect(JSON.stringify(output.s ?? [])).toContain('$rv')
    expect(JSON.stringify(output.s ?? [])).toContain('[0,21]')
  })
})
