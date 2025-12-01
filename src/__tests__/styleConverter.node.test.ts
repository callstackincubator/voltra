import { getModifiersFromStyle } from '../styles/converter'

describe('Style to modifiers conversion', () => {
  describe('Basic conversion', () => {
    it('converts backgroundColor to background modifier', () => {
      const style = {
        backgroundColor: '#FF0000',
      }

      const modifiers = getModifiersFromStyle(style)

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

      const modifiers = getModifiersFromStyle(style)

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

      const modifiers = getModifiersFromStyle(style)

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

      const modifiers = getModifiersFromStyle(style)

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

      const modifiers = getModifiersFromStyle(style)

      expect(modifiers).toHaveLength(1)
      expect(modifiers[0]).toEqual({
        name: 'padding',
        args: { all: 16 },
      })
    })
  })
})
