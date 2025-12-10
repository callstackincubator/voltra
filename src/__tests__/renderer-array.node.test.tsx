import React from 'react'

import { renderVoltraVariantToJson } from '../renderer/renderer'
import { Voltra } from '../server'

describe('renderVoltraVariantToJson array handling', () => {
  it('should render an array of components (Fragment)', () => {
    const element = (
      <>
        <Voltra.Text>Element 1</Voltra.Text>
        <Voltra.Text>Element 2</Voltra.Text>
      </>
    )
    const result = renderVoltraVariantToJson(element)

    // We expect a flat array of elements
    expect(result).toEqual([
      { t: 0, p: {}, c: 'Element 1' },
      { t: 0, p: {}, c: 'Element 2' },
    ])
  })

  it('should flatten nested fragments', () => {
    const element = (
      <>
        <Voltra.Text>Element 1</Voltra.Text>
        <>
          <Voltra.Text>Element 2</Voltra.Text>
          <Voltra.Text>Element 3</Voltra.Text>
        </>
      </>
    )
    const result = renderVoltraVariantToJson(element)

    // With proper flattening, this should be a single flat array
    expect(result).toEqual([
      { t: 0, p: {}, c: 'Element 1' },
      { t: 0, p: {}, c: 'Element 2' },
      { t: 0, p: {}, c: 'Element 3' },
    ])
  })
})
