import React from 'react'

import { Voltra } from '../../server.js'
import { renderLiveActivityToJson } from '../renderer.js'

describe('Optimization', () => {
  test('Empty props and children are omitted', () => {
    const result = renderLiveActivityToJson({
      lockScreen: (
        <Voltra.VStack>
          <Voltra.Text>Hello</Voltra.Text>
          <Voltra.Spacer />
          <Voltra.Image source={{ assetName: 'icon' }} />
        </Voltra.VStack>
      ),
    })

    const vstack = result.ls as any
    const text = vstack.c[0]
    const spacer = vstack.c[1]
    const image = vstack.c[2]

    expect(vstack.p).toBeUndefined()
    expect(text.p).toBeUndefined()
    expect(text.c).toBe('Hello')
    expect(spacer.p).toBeUndefined()
    expect(spacer.c).toBeUndefined()
    expect(image.p).toBeDefined()
    expect(image.p.src).toEqual(JSON.stringify({ assetName: 'icon' }))
    expect(image.c).toBeUndefined()
  })
})
