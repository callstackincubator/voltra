import { useEffect } from 'react'
import { Platform } from 'react-native'
import { setWidgetServerCredentials as setWidgetServerCredentialsAndroid } from '@use-voltra/android-client'
import { setWidgetServerCredentials } from '@use-voltra/ios-client'

const DEMO_TOKEN = 'demo-token'

export function useServerDrivenWidgetToken(): void {
  useEffect(() => {
    void (async () => {
      const credentials = { token: DEMO_TOKEN }

      if (Platform.OS === 'android') {
        await setWidgetServerCredentialsAndroid(credentials)
        return
      }

      await setWidgetServerCredentials(credentials)
    })()
  }, [])
}
