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
  test('supplementalActivityFamilies.small renders to saf_sm key', async () => {
    const result = await renderLiveActivityToJson({
      lockScreen: <Voltra.Text>Lock Screen</Voltra.Text>,
      supplementalActivityFamilies: {
        small: <Voltra.Text>Watch</Voltra.Text>,
      },
    })

    expect(result).toHaveProperty('ls')
    expect(result).toHaveProperty('saf_sm')
  })

  test('supplementalActivityFamilies.small content is rendered correctly', async () => {
    const result = await renderLiveActivityToJson({
      lockScreen: <Voltra.Text>Lock</Voltra.Text>,
      supplementalActivityFamilies: {
        small: (
          <Voltra.VStack>
            <Voltra.Text>Watch Content</Voltra.Text>
          </Voltra.VStack>
        ),
      },
    })

    expect(result.saf_sm).toBeDefined()
    expect(result.saf_sm.t).toBe(11)
    expect(result.saf_sm.c.t).toBe(0)
    expect(result.saf_sm.c.c).toBe('Watch Content')
  })

  test('supplementalActivityFamilies families work with all other variants', async () => {
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
      supplementalActivityFamilies: {
        small: <Voltra.Text>Watch</Voltra.Text>,
      },
    })

    expect(result).toHaveProperty('ls')
    expect(result).toHaveProperty('isl_exp_c')
    expect(result).toHaveProperty('isl_cmp_l')
    expect(result).toHaveProperty('isl_cmp_t')
    expect(result).toHaveProperty('isl_min')
    expect(result).toHaveProperty('saf_sm')
  })

  test('omitting supplementalActivityFamilies.small does not add saf_sm key', async () => {
    const result = await renderLiveActivityToJson({
      lockScreen: <Voltra.Text>Lock</Voltra.Text>,
    })

    expect(result).toHaveProperty('ls')
    expect(result).not.toHaveProperty('saf_sm')
  })

  test('empty supplementalActivityFamilies object does not add saf_sm key', async () => {
    const result = await renderLiveActivityToJson({
      lockScreen: <Voltra.Text>Lock</Voltra.Text>,
      supplementalActivityFamilies: {},
    })

    expect(result).toHaveProperty('ls')
    expect(result).not.toHaveProperty('saf_sm')
  })
})
