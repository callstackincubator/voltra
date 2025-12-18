import React, { forwardRef, useEffect, useImperativeHandle, useMemo, useState } from 'react'
import { addVoltraListener, useVoltra } from 'voltra'

import { LiveActivityExampleComponent } from './types'
import { MusicPlayerLiveActivityUI, SONGS, type Song } from '../../components/live-activities/MusicPlayerLiveActivityUI'

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
      activityName: 'music-player',
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
