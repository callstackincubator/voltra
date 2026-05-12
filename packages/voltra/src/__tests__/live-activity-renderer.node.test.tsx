import React from 'react'

import { Voltra, renderLiveActivityToJson } from '@use-voltra/ios'

describe('Live Activity Renderer', () => {
  test('1. lockScreen only', () => {
    const output = renderLiveActivityToJson({ lockScreen: <Voltra.Text>LS</Voltra.Text> })

    expect(output).toHaveProperty('ls')
    expect(output.ls).toBeDefined()
    expect(Object.keys(output).some((k) => k.startsWith('isl_'))).toBe(false)
  })

  test('2. All regions', () => {
    const output = renderLiveActivityToJson({
      lockScreen: <Voltra.Text>LS</Voltra.Text>,
      island: {
        expanded: {
          center: <Voltra.Text>C</Voltra.Text>,
          leading: <Voltra.Text>L</Voltra.Text>,
          trailing: <Voltra.Text>T</Voltra.Text>,
          bottom: <Voltra.Text>B</Voltra.Text>,
        },
        compact: {
          leading: <Voltra.Text>CL</Voltra.Text>,
          trailing: <Voltra.Text>CT</Voltra.Text>,
        },
        minimal: <Voltra.Text>M</Voltra.Text>,
      },
    })

    expect(output).toHaveProperty('ls')
    expect(output).toHaveProperty('isl_exp_c')
    expect(output).toHaveProperty('isl_exp_l')
    expect(output).toHaveProperty('isl_exp_t')
    expect(output).toHaveProperty('isl_exp_b')
    expect(output).toHaveProperty('isl_cmp_l')
    expect(output).toHaveProperty('isl_cmp_t')
    expect(output).toHaveProperty('isl_min')
  })

  test('3. Empty variant', () => {
    const output = renderLiveActivityToJson({ lockScreen: null })
    expect(output).not.toHaveProperty('ls')
  })

  test('4. Variant with tint', () => {
    const output = renderLiveActivityToJson({
      lockScreen: {
        content: <Voltra.Text>X</Voltra.Text>,
        activityBackgroundTint: '#FF0000',
      },
    })

    const val = (output as any).ls_background_tint || (output as any).abt
    expect(val).toBe('#FF0000')
  })

  test('5. keylineTint', () => {
    const output = renderLiveActivityToJson({
      island: {
        keylineTint: '#00FF00',
        minimal: <Voltra.Text>M</Voltra.Text>,
      },
    })

    const val = (output as any).isl_keyline_tint || (output as any).kt
    expect(val).toBe('#00FF00')
  })

  test('6. activityBackgroundTint', () => {
    const output = renderLiveActivityToJson({
      lockScreen: {
        content: <Voltra.Text>X</Voltra.Text>,
        activityBackgroundTint: '#0000FF',
      },
    })
    const val = (output as any).ls_background_tint || (output as any).abt
    expect(val).toBe('#0000FF')
  })

  test('7. Region short names', () => {
    const output = renderLiveActivityToJson({
      lockScreen: <Voltra.Text>LS</Voltra.Text>,
      island: {
        expanded: { center: <Voltra.Text>C</Voltra.Text> },
        minimal: <Voltra.Text>M</Voltra.Text>,
      },
    })
    expect(output).toHaveProperty('ls')
    expect(output).toHaveProperty('isl_exp_c')
    expect(output).toHaveProperty('isl_min')
  })
})
