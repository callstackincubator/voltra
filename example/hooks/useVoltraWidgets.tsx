import { useEffect } from 'react'
import { AppState } from 'react-native'
import { updateWidget, Voltra } from 'voltra'

const updateWidgets = async () => {
  const weather = (
    <>
      <Voltra.Text>🌤️ Sunny</Voltra.Text>
      <Voltra.Text>🌡️ 72°F</Voltra.Text>
    </>
  )
  const greatWeather = <Voltra.Text>😎 The weather looks great today!</Voltra.Text>

  try {
    await updateWidget('weather', {
      systemSmall: (
        <Voltra.HStack style={{ flex: 1 }}>
          <Voltra.VStack style={{ flex: 1 }}>
            {weather}
            <Voltra.Text style={{ marginTop: 16 }}>🕒 {new Date().toLocaleTimeString()}</Voltra.Text>
          </Voltra.VStack>
        </Voltra.HStack>
      ),
      systemMedium: (
        <Voltra.HStack style={{ flex: 1 }}>
          <Voltra.VStack style={{ flex: 1 }}>
            {weather}

            <Voltra.VStack style={{ marginTop: 16 }}>{greatWeather}</Voltra.VStack>
            <Voltra.VStack style={{ marginTop: 16 }}>
              <Voltra.Text>🕒 Updated at {new Date().toLocaleTimeString()}</Voltra.Text>
            </Voltra.VStack>
          </Voltra.VStack>
        </Voltra.HStack>
      ),
      systemLarge: (
        <Voltra.HStack style={{ flex: 1 }}>
          <Voltra.VStack style={{ flex: 1 }}>
            {weather}

            <Voltra.VStack style={{ marginTop: 16 }}>
              {greatWeather}
              <Voltra.HStack>
                <Voltra.Text>🔥 High: 78°</Voltra.Text>
                <Voltra.Text>❄️ Low: 65°</Voltra.Text>
              </Voltra.HStack>

              <Voltra.Text>🕒 Updated at {new Date().toLocaleTimeString()}</Voltra.Text>
            </Voltra.VStack>
          </Voltra.VStack>
        </Voltra.HStack>
      ),
    })
  } catch (error) {
    console.error('Error updating widgets:', error)
  }
}

/**
 * Hook to manage Voltra widgets.
 */
export const useVoltraWidgets = () => {
  useEffect(() => {
    updateWidgets()

    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') {
        updateWidgets()
      }
    })

    return () => subscription.remove()
  }, [])
}
