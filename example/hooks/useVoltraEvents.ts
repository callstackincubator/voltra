import { useEffect } from 'react'
import { Platform } from 'react-native'
import { addVoltraListener } from 'voltra/client'

export const useVoltraEvents = (): void => {
  useEffect(() => {
    if (Platform.OS !== 'ios') return

    const subscription = addVoltraListener('interaction', (event) => {
      console.log('Voltra event:', event)
    })

    return () => subscription.remove()
  }, [])

  useEffect(() => {
    if (Platform.OS !== 'ios') return

    const subscription = addVoltraListener('activityPushToStartTokenReceived', (event) => {
      console.log('Activity push to start token received:', event)
    })

    return () => subscription.remove()
  }, [])

  useEffect(() => {
    if (Platform.OS !== 'ios') return

    const subscription = addVoltraListener('activityTokenReceived', (event) => {
      console.log('Activity token received:', event)
    })

    return () => subscription.remove()
  }, [])

  useEffect(() => {
    if (Platform.OS !== 'ios') return

    const subscription = addVoltraListener('stateChange', (event) => {
      console.log('Activity update:', event)
    })

    return () => subscription.remove()
  }, [])
}
