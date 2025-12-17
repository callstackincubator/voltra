import React from 'react'
import { Voltra } from '../server'
import { renderVoltraToJson } from '../renderer/renderer'

describe('Stylesheet Deduplication', () => {
  describe('Basic Stylesheet Functionality', () => {
    it('should create shared stylesheet', () => {
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

      expect(result).toHaveProperty('s')
      expect(Array.isArray(result.s)).toBe(true)
      expect(result.s).toHaveLength(1)

      // Verify the style is compressed and contains expected properties
      const style = result.s![0]
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

      expect(result.s).toHaveLength(1)

      // All elements should reference the same style index (0)
      const elements = result.ls!.c
      expect(elements).toHaveLength(3)

      elements.forEach((element: any) => {
        expect(element.p['s']).toBe(0) // All reference style index 0
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

      expect(result.s).toHaveLength(3)

      // Each element should reference a different style index
      const elements = result.ls!.c
      expect(elements).toHaveLength(3)

      const styleIndices = elements.map((element: any) => element.p['s'])
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

      expect(result.s).toHaveLength(1)

      const elements = result.ls!.c
      expect(elements).toHaveLength(3)

      // First element should not have a style property
      expect(elements[0].p).toEqual({})

      // Second and third elements should reference the same style
      expect(elements[1].p['s']).toBe(0)
      expect(elements[2].p['s']).toBe(0)
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

      expect(result.s).toHaveLength(1)

      const style = result.s![0]
      expect(style).toHaveProperty('fs', 16)
      expect(style).toHaveProperty('c', '#FF0000')
      expect(style).toHaveProperty('bg', '#FFFFFF')
      expect(style).toHaveProperty('br', 8)
      expect(style).toHaveProperty('pad', 12)
      expect(style).toHaveProperty('shc', '#000000')
      expect(style).toHaveProperty('sho', { width: 0, height: 2 })
      expect(style).toHaveProperty('shop', 0.1)
      expect(style).toHaveProperty('shr', 4)

      // Element should reference style index
      expect((result.ls as any).p['s']).toBe(0)
    })
  })

  describe('Cross-Variant Deduplication', () => {
    it('should share stylesheet between all variants', () => {
      const sharedStyle = { color: '#FF0000' }

      const result = renderVoltraToJson({
        lockScreen: <Voltra.Text style={sharedStyle}>LockScreen</Voltra.Text>,
        island: {
          expanded: {
            center: <Voltra.Text style={sharedStyle}>Center</Voltra.Text>,
            leading: <Voltra.Text style={sharedStyle}>Leading</Voltra.Text>,
          },
          compact: {
            trailing: <Voltra.Text style={sharedStyle}>Trailing</Voltra.Text>,
          },
        },
      })

      // Should have a single shared stylesheet with one style
      expect(result.s).toHaveLength(1)
      expect(result.s![0]).toHaveProperty('c', '#FF0000')

      // All variants should reference the same style index
      expect((result.ls as any).p['s']).toBe(0)
      expect((result.isl_exp_c as any).p['s']).toBe(0)
      expect((result.isl_exp_l as any).p['s']).toBe(0)
      expect((result.isl_cmp_t as any).p['s']).toBe(0)
    })

    it('should deduplicate styles across lockScreen and island variants', () => {
      const style1 = { color: '#FF0000', fontSize: 16 }
      const style2 = { color: '#00FF00', fontSize: 18 }

      const result = renderVoltraToJson({
        lockScreen: (
          <Voltra.VStack>
            <Voltra.Text style={style1}>Text 1</Voltra.Text>
            <Voltra.Text style={style2}>Text 2</Voltra.Text>
          </Voltra.VStack>
        ),
        island: {
          expanded: {
            center: (
              <Voltra.VStack>
                <Voltra.Text style={style1}>Text 1</Voltra.Text>
                <Voltra.Text style={style2}>Text 2</Voltra.Text>
              </Voltra.VStack>
            ),
          },
        },
      })

      // Should have exactly 2 unique styles
      expect(result.s).toHaveLength(2)

      // LockScreen and island should use the same style indices
      const lsElements = (result.ls as any).c
      const islElements = (result.isl_exp_c as any).c

      expect(lsElements[0].p['s']).toBe(islElements[0].p['s'])
      expect(lsElements[1].p['s']).toBe(islElements[1].p['s'])
    })

    it('should handle different styles in different variants', () => {
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

      // Should have 3 unique styles in the shared stylesheet
      expect(result.s).toHaveLength(3)

      // Each variant element should reference a different style index
      expect((result.isl_exp_c as any).p['s']).toBe(0)
      expect((result.isl_exp_l as any).p['s']).toBe(1)
      expect((result.isl_cmp_t as any).p['s']).toBe(2)
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
      expect(result.s).toHaveLength(1)

      // All text elements should reference the same style index
      const textElements = (result.ls as any).c
      textElements.forEach((element: any) => {
        expect(element.p['s']).toBe(0)
      })

      // Verify the compressed style is present
      const compressedStyle = result.s![0]
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

      expect(result).not.toHaveProperty('s')
    })

    it('should handle empty stylesheet gracefully', () => {
      const result = renderVoltraToJson({
        lockScreen: <Voltra.Text>No Style</Voltra.Text>,
      })

      expect(result).not.toHaveProperty('s')
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
        expect(element.p['s']).toHaveProperty('c', '#FF0000')
        expect(element.p['s']).toHaveProperty('fs', 16)
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
      expect(result.s).toBeDefined()
      expect(result.s!.length).toBeGreaterThan(0)

      // The mask element should have a style reference (number) not an object
      const maskElement = result.ls as any
      expect(maskElement.p).toBeDefined()

      // Check that styles inside maskElement prop are also using indices
      // The maskElement prop should contain components with style references
      // maskElement has short name "me"
      const maskElementProp = maskElement.p['me']
      expect(maskElementProp).toBeDefined()

      // The nested VStack in maskElement should have a style index (number, not object)
      expect(typeof maskElementProp.p['s']).toBe('number')
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
      expect(result.s).toHaveLength(1)

      const maskElement = result.ls as any
      const maskElementProp = maskElement.p['me'] // maskElement has short name "me"
      const children = maskElement.c // children (the content VStack)

      // Both should reference the same style index
      expect(maskElementProp.p['s']).toBe(children.p['s'])
    })
  })
})
