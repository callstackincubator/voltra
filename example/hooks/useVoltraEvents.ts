import { useEffect } from 'react'
import { addVoltraListener } from 'voltra'

export const useVoltraEvents = (): void => {
  useEffect(() => {
    const subscription = addVoltraListener('interaction', (event) => {
      console.log('VoltraUI event:', event)
    })

    return () => subscription.remove()
  }, [])

  useEffect(() => {
    const subscription = addVoltraListener('activityPushToStartTokenReceived', (event) => {
      console.log('Activity push to start token received:', event)
    })

    return () => subscription.remove()
  }, [])

  useEffect(() => {
    const subscription = addVoltraListener('activityTokenReceived', (event) => {
      console.log('Activity token received:', event)
    })

    return () => subscription.remove()
  }, [])

  useEffect(() => {
    const subscription = addVoltraListener('stateChange', (event) => {
      console.log('Activity update:', event)
    })

    return () => subscription.remove()
  }, [])
}
