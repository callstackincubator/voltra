import React from 'react'

import { Voltra, renderWidgetToJson } from '@use-voltra/ios'

describe('Widget Renderer', () => {
  test('1. Single family', () => {
    const output = renderWidgetToJson({ systemSmall: <Voltra.Text>S</Voltra.Text> })
    expect(output).toHaveProperty('systemSmall')
    expect(Object.keys(output)).not.toContain('systemMedium')
  })

  test('2. All families', () => {
    const output = renderWidgetToJson({
      systemSmall: <Voltra.Text>S</Voltra.Text>,
      systemMedium: <Voltra.Text>M</Voltra.Text>,
      systemLarge: <Voltra.Text>L</Voltra.Text>,
      systemExtraLarge: <Voltra.Text>XL</Voltra.Text>,
      accessoryCircular: <Voltra.Text>AC</Voltra.Text>,
      accessoryRectangular: <Voltra.Text>AR</Voltra.Text>,
      accessoryInline: <Voltra.Text>AI</Voltra.Text>,
    })

    expect(output).toHaveProperty('systemSmall')
    expect(output).toHaveProperty('systemMedium')
    expect(output).toHaveProperty('systemLarge')
    expect(output).toHaveProperty('systemExtraLarge')
    expect(output).toHaveProperty('accessoryCircular')
    expect(output).toHaveProperty('accessoryRectangular')
    expect(output).toHaveProperty('accessoryInline')
  })

  test('3. Empty family', () => {
    const output = renderWidgetToJson({ systemSmall: null })
    expect(output).not.toHaveProperty('systemSmall')
  })

  test('4. Family short names', () => {
    const output = renderWidgetToJson({ systemSmall: <Voltra.Text>S</Voltra.Text> })
    expect(output).toHaveProperty('systemSmall')
  })

  test('5. Mixed families', () => {
    const output = renderWidgetToJson({
      systemSmall: <Voltra.Text>S</Voltra.Text>,
      accessoryCircular: <Voltra.Text>AC</Voltra.Text>,
    })
    expect(output).toHaveProperty('systemSmall')
    expect(output).toHaveProperty('accessoryCircular')
    expect(output).not.toHaveProperty('systemMedium')
  })
})
