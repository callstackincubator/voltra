import React from 'react'

import { Voltra } from '../../index.js'
import { renderLiveActivityToJson } from '../renderer.js'

describe('Variants', () => {
  test('All Dynamic Island regions', async () => {
    const result = await renderLiveActivityToJson({
      lockScreen: <Voltra.Text>Lock</Voltra.Text>,
      island: {
        expanded: {
          center: <Voltra.Text>Center</Voltra.Text>,
          leading: <Voltra.Text>Leading</Voltra.Text>,
          trailing: <Voltra.Text>Trailing</Voltra.Text>,
          bottom: <Voltra.Text>Bottom</Voltra.Text>,
        },
        compact: {
          leading: <Voltra.Text>CL</Voltra.Text>,
          trailing: <Voltra.Text>CT</Voltra.Text>,
        },
        minimal: <Voltra.Text>Min</Voltra.Text>,
      },
    })

    expect(result).toHaveProperty('ls')
    expect(result).toHaveProperty('isl_exp_c')
    expect(result).toHaveProperty('isl_exp_l')
    expect(result).toHaveProperty('isl_exp_t')
    expect(result).toHaveProperty('isl_exp_b')
    expect(result).toHaveProperty('isl_cmp_l')
    expect(result).toHaveProperty('isl_cmp_t')
    expect(result).toHaveProperty('isl_min')
  })
})

describe('Supplemental Activity Families (iOS 18+)', () => {
  test('supplemental.small renders to sup_sm key', async () => {
    const result = await renderLiveActivityToJson({
      lockScreen: <Voltra.Text>Lock Screen</Voltra.Text>,
      supplemental: {
        small: <Voltra.Text>Watch</Voltra.Text>,
      },
    })

    expect(result).toHaveProperty('ls')
    expect(result).toHaveProperty('sup_sm')
  })

  test('supplemental.small content is rendered correctly', async () => {
    const result = await renderLiveActivityToJson({
      lockScreen: <Voltra.Text>Lock</Voltra.Text>,
      supplemental: {
        small: (
          <Voltra.VStack>
            <Voltra.Text>Watch Content</Voltra.Text>
          </Voltra.VStack>
        ),
      },
    })

    expect(result.sup_sm).toBeDefined()
    expect(result.sup_sm.t).toBe(11)
    expect(result.sup_sm.c.t).toBe(0)
    expect(result.sup_sm.c.c).toBe('Watch Content')
  })

  test('supplemental families work with all other variants', async () => {
    const result = await renderLiveActivityToJson({
      lockScreen: <Voltra.Text>Lock</Voltra.Text>,
      island: {
        expanded: {
          center: <Voltra.Text>Center</Voltra.Text>,
        },
        compact: {
          leading: <Voltra.Text>CL</Voltra.Text>,
          trailing: <Voltra.Text>CT</Voltra.Text>,
        },
        minimal: <Voltra.Text>Min</Voltra.Text>,
      },
      supplemental: {
        small: <Voltra.Text>Watch</Voltra.Text>,
      },
    })

    expect(result).toHaveProperty('ls')
    expect(result).toHaveProperty('isl_exp_c')
    expect(result).toHaveProperty('isl_cmp_l')
    expect(result).toHaveProperty('isl_cmp_t')
    expect(result).toHaveProperty('isl_min')
    expect(result).toHaveProperty('sup_sm')
  })

  test('omitting supplemental.small does not add sup_sm key', async () => {
    const result = await renderLiveActivityToJson({
      lockScreen: <Voltra.Text>Lock</Voltra.Text>,
    })

    expect(result).toHaveProperty('ls')
    expect(result).not.toHaveProperty('sup_sm')
  })

  test('empty supplemental object does not add sup_sm key', async () => {
    const result = await renderLiveActivityToJson({
      lockScreen: <Voltra.Text>Lock</Voltra.Text>,
      supplemental: {},
    })

    expect(result).toHaveProperty('ls')
    expect(result).not.toHaveProperty('sup_sm')
  })
})
