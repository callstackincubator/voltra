import { getModifiersFromLayoutStyle } from '../styles/converter'

describe('Style to modifiers conversion', () => {
  describe('Basic conversion', () => {
    it('converts backgroundColor to background modifier', () => {
      const style = {
        backgroundColor: '#FF0000',
      }

      const modifiers = getModifiersFromLayoutStyle(style)

      expect(modifiers).toHaveLength(1)
      expect(modifiers[0]).toEqual({
        name: 'background',
        args: { color: '#FF0000' },
      })
    })

    it('converts width and height to frame modifier', () => {
      const style = {
        width: 100,
        height: 200,
      }

      const modifiers = getModifiersFromLayoutStyle(style)

      expect(modifiers).toHaveLength(1)
      expect(modifiers[0]).toEqual({
        name: 'frame',
        args: { width: 100, height: 200 },
      })
    })

    it('converts opacity to opacity modifier', () => {
      const style = {
        opacity: 0.5,
      }

      const modifiers = getModifiersFromLayoutStyle(style)

      expect(modifiers).toHaveLength(1)
      expect(modifiers[0]).toEqual({
        name: 'opacity',
        args: { value: 0.5 },
      })
    })
  })

  describe('Padding grouping', () => {
    it('groups multiple padding properties into single padding modifier', () => {
      const style = {
        paddingTop: 10,
        paddingBottom: 20,
        paddingLeft: 15,
        paddingRight: 25,
      }

      const modifiers = getModifiersFromLayoutStyle(style)

      expect(modifiers).toHaveLength(1)
      expect(modifiers[0]).toEqual({
        name: 'padding',
        args: {
          top: 10,
          bottom: 20,
          leading: 15,
          trailing: 25,
        },
      })
    })

    it('handles uniform padding', () => {
      const style = {
        padding: 16,
      }

      const modifiers = getModifiersFromLayoutStyle(style)

      expect(modifiers).toHaveLength(1)
      expect(modifiers[0]).toEqual({
        name: 'padding',
        args: { all: 16 },
      })
    })
  })

  describe('Modifier order', () => {
    it('orders padding before background when both are present', () => {
      const style = {
        padding: 16,
        backgroundColor: '#FF0000',
      }

      const modifiers = getModifiersFromLayoutStyle(style)

      expect(modifiers).toHaveLength(2)
      expect(modifiers[0].name).toBe('padding')
      expect(modifiers[1].name).toBe('background')
    })

    it('orders padding → background → cornerRadius when borderRadius is present without border', () => {
      const style = {
        padding: 16,
        backgroundColor: '#FF0000',
        borderRadius: 20,
      }

      const modifiers = getModifiersFromLayoutStyle(style)

      expect(modifiers).toHaveLength(3)
      expect(modifiers[0].name).toBe('padding')
      expect(modifiers[1].name).toBe('background')
      expect(modifiers[2].name).toBe('cornerRadius')
      expect(modifiers[2].args).toEqual({ radius: 20 })
    })

    it('orders padding → background → border when borderRadius is present with border', () => {
      const style = {
        padding: 16,
        backgroundColor: '#FF0000',
        borderRadius: 20,
        borderWidth: 2,
        borderColor: '#000000',
      }

      const modifiers = getModifiersFromLayoutStyle(style)

      expect(modifiers).toHaveLength(3)
      expect(modifiers[0].name).toBe('padding')
      expect(modifiers[1].name).toBe('background')
      expect(modifiers[2].name).toBe('border')
      expect(modifiers[2].args).toEqual({
        width: 2,
        color: '#000000',
        cornerRadius: 20,
      })
    })

    it('treats borderWidth 0 as no border and uses cornerRadius instead', () => {
      const style = {
        padding: 16,
        backgroundColor: '#FF0000',
        borderRadius: 20,
        borderWidth: 0,
      }

      const modifiers = getModifiersFromLayoutStyle(style)

      expect(modifiers).toHaveLength(3)
      expect(modifiers[0].name).toBe('padding')
      expect(modifiers[1].name).toBe('background')
      expect(modifiers[2].name).toBe('cornerRadius')
      expect(modifiers[2].args).toEqual({ radius: 20 })
    })
  })
})
