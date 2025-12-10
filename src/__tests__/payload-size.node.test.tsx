import React from 'react'

import { BasicLiveActivityUI } from '../../example/components/live-activities/BasicLiveActivityUI'
import { MusicPlayerLiveActivityUI } from '../../example/components/live-activities/MusicPlayerLiveActivityUI'
import { renderVoltraToString, Voltra } from '../server'

// Sample data for examples
const sampleSong = {
  title: 'Midnight Dreams',
  artist: 'The Voltra Collective',
  image: 'voltra-icon',
}

describe('Payload size regression tests', () => {
  const getPayloadSize = async (variants: Parameters<typeof renderVoltraToString>[0]): Promise<number> => {
    const compressedPayload = await renderVoltraToString(variants)
    return compressedPayload.length
  }

  describe('Simple component tests', () => {
    it('should not increase size for simple text component', async () => {
      const variants = {
        lockScreen: <Voltra.Text>Hello, world!</Voltra.Text>,
      }

      const size = await getPayloadSize(variants)
      expect(size).toMatchSnapshot()
    })

    it('should not increase size for nested components', async () => {
      const variants = {
        lockScreen: (
          <Voltra.VStack>
            <Voltra.Text>Element 1</Voltra.Text>
            <Voltra.Text>Element 2</Voltra.Text>
          </Voltra.VStack>
        ),
      }

      const size = await getPayloadSize(variants)
      expect(size).toMatchSnapshot()
    })

    it('should not increase size for styled components', async () => {
      const variants = {
        lockScreen: (
          <Voltra.Text style={{ fontSize: 18, fontWeight: '600', color: '#FFFFFF' }}>Styled text</Voltra.Text>
        ),
      }

      const size = await getPayloadSize(variants)
      expect(size).toMatchSnapshot()
    })
  })

  describe('Example-based payload tests', () => {
    it('should not increase size for Basic Live Activity example', async () => {
      const variants = {
        lockScreen: <BasicLiveActivityUI />,
      }

      const size = await getPayloadSize(variants)
      expect(size).toMatchSnapshot()
    })

    it('should not increase size for Music Player Live Activity example', async () => {
      const variants = {
        lockScreen: <MusicPlayerLiveActivityUI currentSong={sampleSong} isPlaying={true} />,
      }

      const size = await getPayloadSize(variants)
      expect(size).toMatchSnapshot()
    })
  })
})
