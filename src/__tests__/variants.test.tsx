import React from 'react'

import { Voltra } from '../index'
import { renderVoltraToJson } from '../renderer'

describe('renderVoltraToJson variants', () => {
  it('renders all Dynamic Island regions', async () => {
    const result = await renderVoltraToJson({
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
