import React from 'react'

import { renderVoltraToJson } from '../renderer/renderer'
import { Voltra } from '../server'

test('verifies empty p and c are omitted', () => {
  const result = renderVoltraToJson({
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

  // VStack has no props (no style, no spacing, etc)
  expect(vstack.p).toBeUndefined()

  // Text has no props, but has children (the text content)
  expect(text.p).toBeUndefined()
  expect(text.c).toBe('Hello')

  // Spacer has no props and no children
  expect(spacer.p).toBeUndefined()
  expect(spacer.c).toBeUndefined()

  // Image has props (source), but no children
  expect(image.p).toBeDefined()
  expect(image.p.src).toEqual(JSON.stringify({ assetName: 'icon' }))
  expect(image.c).toBeUndefined()
})
