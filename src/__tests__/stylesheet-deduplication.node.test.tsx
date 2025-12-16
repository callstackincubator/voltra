import React from 'react'
import { Voltra } from '../server'
import { renderVoltraToJson } from '../renderer/renderer'

describe('Stylesheet Deduplication', () => {
  describe('Basic Stylesheet Functionality', () => {
    it('should create stylesheet for lockScreen variant', () => {
      const sharedStyle = {
        color: '#FF0000',
        fontSize: 16,
        fontWeight: 'bold',
      }

      const result = renderVoltraToJson({
        lockScreen: (
          <Voltra.VStack>
            <Voltra.Text style={sharedStyle}>Text 1</Voltra.Text>
            <Voltra.Text style={sharedStyle}>Text 2</Voltra.Text>
          </Voltra.VStack>
        ),
      })

      expect(result).toHaveProperty('ls_s')
      expect(Array.isArray(result.ls_s)).toBe(true)
      expect(result.ls_s).toHaveLength(1)

      // Verify the style is compressed and contains expected properties
      const style = result.ls_s[0]
      expect(style).toHaveProperty('c', '#FF0000')
      expect(style).toHaveProperty('fs', 16)
      expect(style).toHaveProperty('fw', 'bold')
    })

    it('should deduplicate identical style objects', () => {
      const sharedStyle = {
        backgroundColor: '#FFFFFF',
        padding: 10,
      }

      const result = renderVoltraToJson({
        lockScreen: (
          <Voltra.VStack>
            <Voltra.Text style={sharedStyle}>Text 1</Voltra.Text>
            <Voltra.Text style={sharedStyle}>Text 2</Voltra.Text>
            <Voltra.Text style={sharedStyle}>Text 3</Voltra.Text>
          </Voltra.VStack>
        ),
      })

      expect(result.ls_s).toHaveLength(1)

      // All elements should reference the same style index (0)
      const elements = result.ls.c
      expect(elements).toHaveLength(3)

      elements.forEach((element: any) => {
        expect(element.p[0]).toBe(0) // All reference style index 0
      })
    })

    it('should assign different indices to different styles', () => {
      const style1 = { color: '#FF0000', fontSize: 16 }
      const style2 = { color: '#00FF00', fontSize: 18 }
      const style3 = { color: '#0000FF', fontSize: 20 }

      const result = renderVoltraToJson({
        lockScreen: (
          <Voltra.VStack>
            <Voltra.Text style={style1}>Text 1</Voltra.Text>
            <Voltra.Text style={style2}>Text 2</Voltra.Text>
            <Voltra.Text style={style3}>Text 3</Voltra.Text>
          </Voltra.VStack>
        ),
      })

      expect(result.ls_s).toHaveLength(3)

      // Each element should reference a different style index
      const elements = result.ls.c
      expect(elements).toHaveLength(3)

      const styleIndices = elements.map((element: any) => element.p[0])
      expect(styleIndices).toEqual([0, 1, 2])
    })

    it('should handle mixed styled and unstyled elements', () => {
      const sharedStyle = { fontSize: 14, color: '#333333' }

      const result = renderVoltraToJson({
        lockScreen: (
          <Voltra.VStack>
            <Voltra.Text>Unstyled Text</Voltra.Text>
            <Voltra.Text style={sharedStyle}>Styled Text 1</Voltra.Text>
            <Voltra.Text style={sharedStyle}>Styled Text 2</Voltra.Text>
          </Voltra.VStack>
        ),
      })

      expect(result.ls_s).toHaveLength(1)

      const elements = result.ls.c
      expect(elements).toHaveLength(3)

      // First element should not have a style property
      expect(elements[0].p).toEqual({})

      // Second and third elements should reference the same style
      expect(elements[1].p[0]).toBe(0)
      expect(elements[2].p[0]).toBe(0)
    })

    it('should handle complex nested styles', () => {
      const complexStyle = {
        fontSize: 16,
        color: '#FF0000',
        backgroundColor: '#FFFFFF',
        borderRadius: 8,
        padding: 12,
        shadowColor: '#000000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
      }

      const result = renderVoltraToJson({
        lockScreen: <Voltra.Text style={complexStyle}>Complex Style</Voltra.Text>,
      })

      expect(result.ls_s).toHaveLength(1)

      const style = result.ls_s[0]
      expect(style).toHaveProperty('fs', 16)
      expect(style).toHaveProperty('c', '#FF0000')
      expect(style).toHaveProperty('bg', '#FFFFFF')
      expect(style).toHaveProperty('br', 8)
      expect(style).toHaveProperty('pad', 12)
      expect(style).toHaveProperty('sc', '#000000')
      expect(style).toHaveProperty('so', { width: 0, height: 2 })
      expect(style).toHaveProperty('sop', 0.1)
      expect(style).toHaveProperty('sr', 4)

      // Element should reference style index
      expect(result.ls.p[0]).toBe(0)
    })
  })

  describe('Island Variants', () => {
    it('should create separate stylesheets for each island variant', () => {
      const style1 = { color: '#FF0000' }
      const style2 = { color: '#00FF00' }
      const style3 = { color: '#0000FF' }

      const result = renderVoltraToJson({
        island: {
          expanded: {
            center: <Voltra.Text style={style1}>Center</Voltra.Text>,
            leading: <Voltra.Text style={style2}>Leading</Voltra.Text>,
          },
          compact: {
            trailing: <Voltra.Text style={style3}>Trailing</Voltra.Text>,
          },
        },
      })

      // Each variant should have its own stylesheet
      expect(result.isl_exp_c_s).toHaveLength(1)
      expect(result.isl_exp_l_s).toHaveLength(1)
      expect(result.isl_cmp_t_s).toHaveLength(1)

      // Each stylesheet should contain the respective style
      expect(result.isl_exp_c_s[0]).toHaveProperty('c', '#FF0000')
      expect(result.isl_exp_l_s[0]).toHaveProperty('c', '#00FF00')
      expect(result.isl_cmp_t_s[0]).toHaveProperty('c', '#0000FF')
    })

    it('should deduplicate within each island variant separately', () => {
      const sharedStyle = { fontSize: 14 }

      const result = renderVoltraToJson({
        island: {
          expanded: {
            center: (
              <Voltra.VStack>
                <Voltra.Text style={sharedStyle}>Text 1</Voltra.Text>
                <Voltra.Text style={sharedStyle}>Text 2</Voltra.Text>
              </Voltra.VStack>
            ),
          },
          compact: {
            leading: (
              <Voltra.VStack>
                <Voltra.Text style={sharedStyle}>Text 3</Voltra.Text>
                <Voltra.Text style={sharedStyle}>Text 4</Voltra.Text>
              </Voltra.VStack>
            ),
          },
        },
      })

      // Each variant should have its own stylesheet with the shared style
      expect(result.isl_exp_c_s).toHaveLength(1)
      expect(result.isl_cmp_l_s).toHaveLength(1)

      // Both stylesheets should contain the same compressed style
      expect(result.isl_exp_c_s[0]).toEqual(result.isl_cmp_l_s[0])
    })
  })

  describe('Payload Size Reduction', () => {
    it('should reduce payload size with deduplication', () => {
      const sharedStyle = {
        color: '#94A3B8',
        fontSize: 16,
        fontWeight: '500',
        backgroundColor: '#FFFFFF',
        padding: 12,
        borderRadius: 8,
        shadowColor: '#000000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
      }

      // Create a component that uses the same style multiple times
      const componentWithRepeatedStyles = (
        <Voltra.VStack>
          <Voltra.Text style={sharedStyle}>Item 1</Voltra.Text>
          <Voltra.Text style={sharedStyle}>Item 2</Voltra.Text>
          <Voltra.Text style={sharedStyle}>Item 3</Voltra.Text>
          <Voltra.Text style={sharedStyle}>Item 4</Voltra.Text>
          <Voltra.Text style={sharedStyle}>Item 5</Voltra.Text>
        </Voltra.VStack>
      )

      const result = renderVoltraToJson({
        lockScreen: componentWithRepeatedStyles,
      })

      // Should have one style in the stylesheet (all Text elements use the same shared style)
      expect(result.ls_s).toHaveLength(1)

      // All text elements should reference the same style index
      const textElements = result.ls.c
      textElements.forEach((element: any) => {
        expect(element.p[0]).toBe(0)
      })

      // Verify the compressed style is present
      const compressedStyle = result.ls_s[0]
      expect(compressedStyle).toHaveProperty('c', '#94A3B8')
      expect(compressedStyle).toHaveProperty('fs', 16)
      expect(compressedStyle).toHaveProperty('fw', '500')
    })

    it('should not create stylesheet when no styles are used', () => {
      const result = renderVoltraToJson({
        lockScreen: (
          <Voltra.VStack>
            <Voltra.Text>Plain Text 1</Voltra.Text>
            <Voltra.Text>Plain Text 2</Voltra.Text>
          </Voltra.VStack>
        ),
      })

      expect(result).not.toHaveProperty('ls_s')
    })

    it('should handle empty stylesheet gracefully', () => {
      const result = renderVoltraToJson({
        lockScreen: <Voltra.Text>No Style</Voltra.Text>,
      })

      expect(result).not.toHaveProperty('ls_s')
    })
  })

  describe('Backwards Compatibility', () => {
    it('should still work with renderVoltraVariantToJson without stylesheets', () => {
      const { renderVoltraVariantToJson } = require('../renderer/renderer')

      const sharedStyle = { color: '#FF0000', fontSize: 16 }

      const element = (
        <Voltra.VStack>
          <Voltra.Text style={sharedStyle}>Text 1</Voltra.Text>
          <Voltra.Text style={sharedStyle}>Text 2</Voltra.Text>
        </Voltra.VStack>
      )

      const result = renderVoltraVariantToJson(element)

      // Should inline styles instead of using stylesheet
      const elements = result.c
      expect(elements).toHaveLength(2)

      elements.forEach((element: any) => {
        expect(element.p[0]).toHaveProperty('c', '#FF0000')
        expect(element.p[0]).toHaveProperty('fs', 16)
      })
    })
  })

  describe('Nested Component Props', () => {
    it('should handle styles in component props like maskElement', () => {
      const sharedStyle = { backgroundColor: '#FFFFFF', borderRadius: 8 }
      const contentStyle = { height: 8, borderRadius: 8 }

      const result = renderVoltraToJson({
        lockScreen: (
          <Voltra.Mask
            maskElement={
              <Voltra.VStack style={sharedStyle}>
                <Voltra.Text style={sharedStyle}>Mask Content</Voltra.Text>
              </Voltra.VStack>
            }
          >
            <Voltra.VStack style={contentStyle}>
              <Voltra.Text>Main Content</Voltra.Text>
            </Voltra.VStack>
          </Voltra.Mask>
        ),
      })

      // Should have styles in the stylesheet
      expect(result.ls_s).toBeDefined()
      expect(result.ls_s!.length).toBeGreaterThan(0)

      // The mask element should have a style reference (number) not an object
      const maskElement = result.ls as any
      expect(maskElement.p).toBeDefined()

      // Check that styles inside maskElement prop are also using indices
      // The maskElement prop should contain components with style references
      // maskElement has prop ID 17
      const maskElementProp = maskElement.p[17]
      expect(maskElementProp).toBeDefined()

      // The nested VStack in maskElement should have a style index (number, not object)
      expect(typeof maskElementProp.p[0]).toBe('number')
    })

    it('should deduplicate styles across main content and component props', () => {
      const sharedStyle = { backgroundColor: '#FF0000', borderRadius: 8 }

      const result = renderVoltraToJson({
        lockScreen: (
          <Voltra.Mask
            maskElement={
              <Voltra.VStack style={sharedStyle}>
                <Voltra.Text>Mask</Voltra.Text>
              </Voltra.VStack>
            }
          >
            <Voltra.VStack style={sharedStyle}>
              <Voltra.Text>Content</Voltra.Text>
            </Voltra.VStack>
          </Voltra.Mask>
        ),
      })

      // Should have only one unique style (the sharedStyle)
      expect(result.ls_s).toHaveLength(1)

      const maskElement = result.ls as any
      const maskElementProp = maskElement.p[17] // maskElement has prop ID 17
      const children = maskElement.c // children (the content VStack)

      // Both should reference the same style index
      expect(maskElementProp.p[0]).toBe(children.p[0])
    })
  })
})
