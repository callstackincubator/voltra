import React from 'react'
import { Voltra } from 'voltra'

type Song = {
  title: string
  artist: string
  image: string
}

export const SONGS: Song[] = [
  { title: 'Midnight Dreams', artist: 'The Voltra Collective', image: 'voltra-icon' },
  { title: 'Electric Pulse', artist: 'Neon Waves', image: 'voltra-light' },
  { title: 'Starlight Symphony', artist: 'Cosmic Harmony', image: 'voltra-icon' },
  { title: 'Urban Echoes', artist: 'City Lights', image: 'voltra-light' },
  { title: 'Ocean Breeze', artist: 'Coastal Vibes', image: 'voltra-icon' },
]

type MusicPlayerLiveActivityUIProps = {
  currentSong: Song
  isPlaying: boolean
}

export function MusicPlayerLiveActivityUI({ currentSong, isPlaying }: MusicPlayerLiveActivityUIProps) {
  return (
    <Voltra.VStack
      id="music-player-live-activity"
      style={{
        padding: 12,
      }}
      spacing={16}
    >
      <Voltra.HStack spacing={16}>
        <Voltra.Image
          id={currentSong.image}
          source={{ assetName: currentSong.image }}
          style={{
            width: 120,
            height: 120,
            borderRadius: 12,
          }}
          resizeMode="cover"
        />

        <Voltra.VStack spacing={4}>
          <Voltra.Text
            style={{
              color: '#F0F9FF',
              fontSize: 20,
              fontWeight: '700',
              letterSpacing: -0.5,
            }}
          >
            {currentSong.title}
          </Voltra.Text>
          <Voltra.Text
            style={{
              color: '#94A3B8',
              fontSize: 15,
              fontWeight: '500',
            }}
          >
            {currentSong.artist}
          </Voltra.Text>
          <Voltra.HStack spacing={8} style={{ marginTop: 8 }}>
            <Voltra.Button id="previous-button">
              <Voltra.Symbol name="backward.fill" type="hierarchical" scale="large" tintColor="#F0F9FF" />
            </Voltra.Button>
            <Voltra.Button id="play-pause-button">
              <Voltra.Symbol
                name={isPlaying ? 'pause.fill' : 'play.fill'}
                type="hierarchical"
                scale="large"
                tintColor="#F0F9FF"
              />
            </Voltra.Button>
            <Voltra.Button id="next-button">
              <Voltra.Symbol name="forward.fill" type="hierarchical" scale="large" tintColor="#F0F9FF" />
            </Voltra.Button>
          </Voltra.HStack>
        </Voltra.VStack>
      </Voltra.HStack>
    </Voltra.VStack>
  )
}

export { SONGS }
export type { Song }
