import React, { forwardRef, useEffect, useImperativeHandle, useMemo, useState } from 'react'
import { StyleSheet } from 'react-native'
import { addVoltraListener, useVoltra, Voltra } from 'voltra'

import { LiveActivityExampleComponent } from './types'

type Song = {
  title: string
  artist: string
  image: string
}

const SONGS: Song[] = [
  { title: 'Midnight Dreams', artist: 'The Voltra Collective', image: 'voltra-icon' },
  { title: 'Electric Pulse', artist: 'Neon Waves', image: 'voltra-light' },
  { title: 'Starlight Symphony', artist: 'Cosmic Harmony', image: 'voltra-icon' },
  { title: 'Urban Echoes', artist: 'City Lights', image: 'voltra-light' },
  { title: 'Ocean Breeze', artist: 'Coastal Vibes', image: 'voltra-icon' },
]

const styles = StyleSheet.create({
  card: {
    padding: 20,
    borderRadius: 24,
    backgroundColor: '#0A0E1A',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(148, 163, 184, 0.1)',
  },
  albumArt: {
    width: 120,
    height: 120,
    borderRadius: 12,
  },
  title: {
    color: '#F0F9FF',
    fontSize: 20,
    fontWeight: '700',
    letterSpacing: -0.5,
  },
  artist: {
    color: '#94A3B8',
    fontSize: 15,
    fontWeight: '500',
  },
  controlsContainer: {
    marginTop: 8,
  },
  controlButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(148, 163, 184, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  playButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(148, 163, 184, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  controlButtonText: {
    color: '#F0F9FF',
    fontSize: 16,
    fontWeight: '600',
  },
  playButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '700',
  },
})

type MusicPlayerLiveActivityUIProps = {
  currentSong: Song
  isPlaying: boolean
}

function MusicPlayerLiveActivityUI({ currentSong, isPlaying }: MusicPlayerLiveActivityUIProps) {
  return (
    <Voltra.VStack id="music-player-live-activity" style={styles.card} spacing={16}>
      <Voltra.HStack spacing={16} alignment="center">
        <Voltra.Image id={currentSong.image} assetName={currentSong.image} style={styles.albumArt} resizeMode="cover" />
        <Voltra.VStack spacing={4} style={{ flex: 1 }}>
          <Voltra.Text style={styles.title}>{currentSong.title}</Voltra.Text>
          <Voltra.Text style={styles.artist}>{currentSong.artist}</Voltra.Text>
          <Voltra.HStack spacing={8} style={styles.controlsContainer}>
            <Voltra.Button id="previous-button" style={styles.controlButton}>
              <Voltra.Symbol name="backward.fill" type="hierarchical" scale="large" tintColor="#F0F9FF" />
            </Voltra.Button>
            <Voltra.Button id="play-pause-button" style={styles.playButton}>
              <Voltra.Symbol
                name={isPlaying ? 'pause.fill' : 'play.fill'}
                type="hierarchical"
                scale="large"
                tintColor="#F0F9FF"
              />
            </Voltra.Button>
            <Voltra.Button id="next-button" style={styles.controlButton}>
              <Voltra.Symbol name="forward.fill" type="hierarchical" scale="large" tintColor="#F0F9FF" />
            </Voltra.Button>
          </Voltra.HStack>
        </Voltra.VStack>
      </Voltra.HStack>
    </Voltra.VStack>
  )
}

const MusicPlayerLiveActivity: LiveActivityExampleComponent = forwardRef(
  ({ autoUpdate = true, autoStart = false, onIsActiveChange }, ref) => {
    const [currentSongIndex, setCurrentSongIndex] = useState(0)
    const [isPlaying, setIsPlaying] = useState(false)

    const currentSong = SONGS[currentSongIndex]

    const variants = useMemo(
      () => ({
        lockScreen: <MusicPlayerLiveActivityUI currentSong={currentSong} isPlaying={isPlaying} />,
      }),
      [currentSong, isPlaying]
    )

    const { start, update, end, isActive } = useVoltra(variants, {
      activityId: 'music-player',
      autoUpdate,
      autoStart,
    })

    useEffect(() => {
      onIsActiveChange?.(isActive)
    }, [isActive, onIsActiveChange])

    useEffect(() => {
      if (!isActive) return

      const subscription = addVoltraListener('interaction', (event) => {
        switch (event.identifier) {
          case 'previous-button':
            setCurrentSongIndex((prev) => (prev === 0 ? SONGS.length - 1 : prev - 1))
            break
          case 'play-pause-button':
            setIsPlaying((prev) => !prev)
            break
          case 'next-button':
            setCurrentSongIndex((prev) => (prev === SONGS.length - 1 ? 0 : prev + 1))
            break
        }
      })

      return () => subscription.remove()
    }, [isActive])

    useImperativeHandle(ref, () => ({
      start,
      update,
      end,
    }))

    return null
  }
)

MusicPlayerLiveActivity.displayName = 'MusicPlayerLiveActivity'

export default MusicPlayerLiveActivity
export { MusicPlayerLiveActivityUI }
