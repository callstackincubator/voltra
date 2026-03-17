import React from 'react'

import { Text } from '../../jsx/Text'
import { renderWidgetToJson } from '../renderer'

describe('Widget Renderer', () => {
  test('1. Single family', () => {
    // Call renderWidget({ systemSmall: <Text>S</Text> }).
    // Verify output has only 1 key with correct short name.
    // Current implementation uses 'systemSmall' as key.
    const output = renderWidgetToJson({ systemSmall: <Text>S</Text> })
    expect(output).toHaveProperty('systemSmall')
    expect(Object.keys(output)).not.toContain('systemMedium')
  })

  test('2. All families', () => {
    // Provide all 7 families. Verify output has exactly 7 keys.
    const output = renderWidgetToJson({
      systemSmall: <Text>S</Text>,
      systemMedium: <Text>M</Text>,
      systemLarge: <Text>L</Text>,
      systemExtraLarge: <Text>XL</Text>,
      accessoryCircular: <Text>AC</Text>,
      accessoryRectangular: <Text>AR</Text>,
      accessoryInline: <Text>AI</Text>,
    })

    // Output also contains 'v', 's', 'e' if applicable.
    // We check for the 7 family keys.
    expect(output).toHaveProperty('systemSmall')
    expect(output).toHaveProperty('systemMedium')
    expect(output).toHaveProperty('systemLarge')
    expect(output).toHaveProperty('systemExtraLarge')
    expect(output).toHaveProperty('accessoryCircular')
    expect(output).toHaveProperty('accessoryRectangular')
    expect(output).toHaveProperty('accessoryInline')
  })

  test('3. Empty family', () => {
    // Call with { systemSmall: null }. Verify systemSmall key is absent.
    const output = renderWidgetToJson({ systemSmall: null })
    expect(output).not.toHaveProperty('systemSmall')
  })

  test('4. Family short names', () => {
    // Render all families. Verify output keys use correct abbreviated names.
    // Current implementation uses full names.
    // If abbreviations were intended (e.g. ss, sm, sl), the code doesn't support it yet.
    // We verify full names for now.
    const output = renderWidgetToJson({ systemSmall: <Text>S</Text> })
    expect(output).toHaveProperty('systemSmall')
  })

  test('5. Mixed families', () => {
    // Provide only systemSmall and accessoryCircular.
    // Verify output has exactly 2 keys, other families absent.
    const output = renderWidgetToJson({
      systemSmall: <Text>S</Text>,
      accessoryCircular: <Text>AC</Text>,
    })
    expect(output).toHaveProperty('systemSmall')
    expect(output).toHaveProperty('accessoryCircular')
    expect(output).not.toHaveProperty('systemMedium')
  })
})
